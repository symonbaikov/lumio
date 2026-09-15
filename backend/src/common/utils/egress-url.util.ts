import { lookup as dnsLookup, promises as dns } from 'node:dns';
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import * as net from 'node:net';
import { BadRequestException } from '@nestjs/common';
import { Agent as UndiciAgent } from 'undici';

type LookupResult = Array<{ address: string }>;
type LookupFn = (host: string) => Promise<LookupResult>;
type NodeLookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string,
  family: 4 | 6,
) => void;

type EgressValidationOptions = {
  lookup?: LookupFn;
};

const IPV4_PRIVATE_RANGES: Array<[number, number]> = [
  [ipv4ToNumber('0.0.0.0'), ipv4ToNumber('0.255.255.255')],
  [ipv4ToNumber('10.0.0.0'), ipv4ToNumber('10.255.255.255')],
  [ipv4ToNumber('100.64.0.0'), ipv4ToNumber('100.127.255.255')],
  [ipv4ToNumber('127.0.0.0'), ipv4ToNumber('127.255.255.255')],
  [ipv4ToNumber('169.254.0.0'), ipv4ToNumber('169.254.255.255')],
  [ipv4ToNumber('172.16.0.0'), ipv4ToNumber('172.31.255.255')],
  [ipv4ToNumber('192.0.0.0'), ipv4ToNumber('192.0.0.255')],
  [ipv4ToNumber('192.0.2.0'), ipv4ToNumber('192.0.2.255')],
  [ipv4ToNumber('192.168.0.0'), ipv4ToNumber('192.168.255.255')],
  [ipv4ToNumber('198.18.0.0'), ipv4ToNumber('198.19.255.255')],
  [ipv4ToNumber('198.51.100.0'), ipv4ToNumber('198.51.100.255')],
  [ipv4ToNumber('203.0.113.0'), ipv4ToNumber('203.0.113.255')],
  [ipv4ToNumber('224.0.0.0'), ipv4ToNumber('255.255.255.255')],
];

const BLOCKED_IPV6_PREFIXES = [
  '::1',
  '::',
  'fc',
  'fd',
  'fe8',
  'fe9',
  'fea',
  'feb',
  'ff',
  '2001:db8',
];

function ipv4ToNumber(address: string): number {
  return (
    address.split('.').reduce((sum, octet) => (sum << 8) + Number.parseInt(octet, 10), 0) >>> 0
  );
}

export function isBlockedEgressAddress(address: string): boolean {
  const ipVersion = net.isIP(address);
  if (ipVersion === 4) {
    const value = ipv4ToNumber(address);
    return IPV4_PRIVATE_RANGES.some(([start, end]) => value >= start && value <= end);
  }

  if (ipVersion === 6) {
    const normalized = address.toLowerCase();
    return BLOCKED_IPV6_PREFIXES.some(
      prefix => normalized === prefix || normalized.startsWith(prefix),
    );
  }

  return false;
}

export async function assertPublicEgressHost(
  host: string,
  options: EgressValidationOptions = {},
): Promise<void> {
  const normalizedHost = host.trim().replace(/^\[|\]$/g, '');
  if (!normalizedHost || normalizedHost.toLowerCase() === 'localhost') {
    throw new BadRequestException('Destination host is not allowed');
  }

  if (net.isIP(normalizedHost)) {
    if (isBlockedEgressAddress(normalizedHost)) {
      throw new BadRequestException('Destination address is not allowed');
    }
    return;
  }

  const lookup = options.lookup || (async (name: string) => dns.lookup(name, { all: true }));
  const records = await lookup(normalizedHost);
  if (records.length === 0 || records.some(record => isBlockedEgressAddress(record.address))) {
    throw new BadRequestException('Destination resolves to a blocked address');
  }
}

export async function assertPublicEgressUrl(
  value: string,
  options: EgressValidationOptions = {},
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new BadRequestException('Destination URL is invalid');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new BadRequestException('Destination URL protocol is not allowed');
  }

  await assertPublicEgressHost(parsed.hostname, options);
  return parsed;
}

export function createPublicEgressLookup() {
  return (hostname: string, _options: unknown, callback: NodeLookupCallback): void => {
    dns
      .lookup(hostname, { all: true })
      .then(records => {
        if (
          records.length === 0 ||
          records.some(record => isBlockedEgressAddress(record.address))
        ) {
          const error = new Error(
            'Destination resolves to a blocked address',
          ) as NodeJS.ErrnoException;
          error.code = 'EHOSTUNREACH';
          callback(error, '', 4);
          return;
        }
        const record = records[0];
        callback(null, record.address, record.family as 4 | 6);
      })
      .catch(error => callback(error as NodeJS.ErrnoException, '', 4));
  };
}

export function createPublicEgressHttpAgents() {
  const lookup = createPublicEgressLookup();
  return {
    lookup,
    httpAgent: new HttpAgent({ lookup }),
    httpsAgent: new HttpsAgent({ lookup }),
  };
}

const safeLookup = createPublicEgressLookup();

async function lookupPublicAddress(hostname: string): Promise<{ address: string; family: 4 | 6 }> {
  return new Promise((resolve, reject) => {
    safeLookup(hostname, {}, (err, address, family) => {
      if (!err) {
        resolve({ address, family });
        return;
      }
      dnsLookup(hostname, (fallbackErr, fallbackAddress, fallbackFamily) => {
        if (fallbackErr) {
          reject(err);
          return;
        }
        if (isBlockedEgressAddress(fallbackAddress)) {
          reject(err);
          return;
        }
        resolve({ address: fallbackAddress, family: fallbackFamily as 4 | 6 });
      });
    });
  });
}

const publicEgressFetchDispatcher = new UndiciAgent({
  connect: {
    lookup(hostname, _options, callback) {
      lookupPublicAddress(hostname)
        .then(({ address, family }) => callback(null, address, family))
        .catch(error => callback(error as NodeJS.ErrnoException, '', 4));
    },
  },
});

const MAX_EGRESS_REDIRECTS = 3;

/**
 * `fetch` for user-supplied destinations.
 *
 * `assertPublicEgressUrl` alone is not enough when it only runs at the moment a
 * URL is saved: the host can start resolving somewhere private afterwards, and
 * plain `fetch` follows redirects, so one 302 to 169.254.169.254 walks straight
 * past a check done earlier. This re-validates on every hop and refuses to
 * follow a redirect it has not validated.
 *
 * Residual risk worth naming: between the DNS lookup here and the socket the
 * runtime opens, a hostile resolver can still answer differently (classic DNS
 * rebinding). Closing that needs a dispatcher that pins the resolved address —
 * `createPublicEgressHttpAgents` does it for the axios/node-http callers.
 */
export async function fetchPublicUrl(
  url: string,
  init: RequestInit = {},
  redirectsLeft = MAX_EGRESS_REDIRECTS,
): Promise<Response> {
  await assertPublicEgressUrl(url);

  const response = await fetch(url, {
    ...init,
    redirect: 'manual',
    dispatcher: publicEgressFetchDispatcher,
  });

  if (response.status < 300 || response.status >= 400) {
    return response;
  }

  const location = response.headers.get('location');
  if (!location) {
    return response;
  }

  if (redirectsLeft <= 0) {
    throw new BadRequestException('Destination redirected too many times');
  }

  const target = new URL(location, url).toString();
  // A redirect turns the follow-up into a GET unless it is 307/308, and the
  // original body must not be replayed to a new host either way.
  const isMethodPreserving = response.status === 307 || response.status === 308;
  const nextInit: RequestInit = isMethodPreserving
    ? init
    : { ...init, method: 'GET', body: undefined };

  return fetchPublicUrl(target, nextInit, redirectsLeft - 1);
}
