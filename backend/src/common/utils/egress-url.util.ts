import { promises as dns } from 'node:dns';
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import * as net from 'node:net';
import { BadRequestException } from '@nestjs/common';

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
