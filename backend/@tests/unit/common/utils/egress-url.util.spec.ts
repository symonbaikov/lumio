import { BadRequestException } from '@nestjs/common';
import {
  assertPublicEgressHost,
  assertPublicEgressUrl,
  fetchPublicUrl,
  isBlockedEgressAddress,
} from '@/common/utils/egress-url.util';

describe('egress-url.util', () => {
  it.each(['127.0.0.1', '10.0.0.5', '172.16.1.1', '192.168.1.20', '169.254.169.254', '::1'])(
    'blocks private or local address %s',
    address => {
      expect(isBlockedEgressAddress(address)).toBe(true);
    },
  );

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])(
    'allows public address %s',
    address => {
      expect(isBlockedEgressAddress(address)).toBe(false);
    },
  );

  it('rejects private literal URL hosts before any network request', async () => {
    await expect(assertPublicEgressUrl('http://169.254.169.254/latest')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects resolved private DNS addresses', async () => {
    await expect(
      assertPublicEgressHost('metadata.google.internal', {
        lookup: jest.fn().mockResolvedValue([{ address: '169.254.169.254' }]),
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('fetchPublicUrl', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
  });

  const respond = (status: number, location?: string): Response =>
    ({
      status,
      headers: { get: (name: string) => (name === 'location' ? (location ?? null) : null) },
    }) as unknown as Response;

  it('refuses a destination that resolves to a private address', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;

    await expect(fetchPublicUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow(
      BadRequestException,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('refuses a non-http protocol', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;

    await expect(fetchPublicUrl('file:///etc/passwd')).rejects.toThrow(BadRequestException);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // The bypass this function exists for: the destination passes validation and
  // then redirects somewhere private.
  it('does not follow a redirect to a blocked address', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        respond(302, 'http://169.254.169.254/latest/meta-data'),
      ) as unknown as typeof fetch;

    await expect(fetchPublicUrl('http://8.8.8.8/start')).rejects.toThrow(BadRequestException);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('never lets plain fetch follow redirects on its own', async () => {
    const spy = jest.fn().mockResolvedValue(respond(200));
    global.fetch = spy as unknown as typeof fetch;

    await fetchPublicUrl('http://8.8.8.8/ok');

    expect(spy.mock.calls[0][1]).toEqual(expect.objectContaining({ redirect: 'manual' }));
  });

  it('stops after too many redirects instead of looping', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(respond(302, 'http://8.8.8.8/next')) as unknown as typeof fetch;

    await expect(fetchPublicUrl('http://8.8.8.8/start')).rejects.toThrow(
      'Destination redirected too many times',
    );
  });

  it('drops the body when a redirect changes the method to GET', async () => {
    const spy = jest
      .fn()
      .mockResolvedValueOnce(respond(302, 'http://1.1.1.1/next'))
      .mockResolvedValueOnce(respond(200));
    global.fetch = spy as unknown as typeof fetch;

    await fetchPublicUrl('http://8.8.8.8/start', { method: 'POST', body: 'secret' });

    expect(spy.mock.calls[1][1]).toEqual(
      expect.objectContaining({ method: 'GET', body: undefined }),
    );
  });

  it('keeps the method and body for a 308, which preserves them by spec', async () => {
    const spy = jest
      .fn()
      .mockResolvedValueOnce(respond(308, 'http://1.1.1.1/next'))
      .mockResolvedValueOnce(respond(200));
    global.fetch = spy as unknown as typeof fetch;

    await fetchPublicUrl('http://8.8.8.8/start', { method: 'POST', body: 'payload' });

    expect(spy.mock.calls[1][1]).toEqual(
      expect.objectContaining({ method: 'POST', body: 'payload' }),
    );
  });
});
