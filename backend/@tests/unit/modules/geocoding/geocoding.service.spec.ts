import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { GeocodingService } from '@/modules/geocoding/geocoding.service';

const DAY_MS = 24 * 60 * 60 * 1000;

const makeCache = () => {
  const store = new Map<string, unknown>();
  return {
    store,
    get: jest.fn(async (key: string) => store.get(key)),
    set: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  };
};

const makeConfig = (values: Record<string, string | undefined>) =>
  ({ get: jest.fn((key: string) => values[key]) }) as unknown as ConfigService;

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe('GeocodingService', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  let warnSpy: jest.SpyInstance;

  const create = (
    values: Record<string, string | undefined> = { GEOCODER_URL: 'http://nominatim:8080/' },
    cache = makeCache(),
  ) => ({
    service: new GeocodingService(cache as unknown as Cache, makeConfig(values)),
    cache,
  });

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    global.fetch = originalFetch;
  });

  it('does nothing when no geocoder is configured', async () => {
    const { service } = create({});

    await expect(service.geocode('г. Алматы, ул. Абая 10')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('treats a non-http GEOCODER_URL as disabled', async () => {
    const { service } = create({ GEOCODER_URL: 'ftp://nominatim' });

    await expect(service.geocode('г. Алматы, ул. Абая 10')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('queries the Nominatim search endpoint and parses string coordinates', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ lat: '43.2383', lon: '76.9453' }]));
    const { service } = create();

    await expect(service.geocode('  г. Алматы,   ул. Абая 10 ')).resolves.toEqual({
      lat: 43.2383,
      lng: 76.9453,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe('http://nominatim:8080/search');
    expect(parsed.searchParams.get('q')).toBe('г. алматы, ул. абая 10');
    expect(parsed.searchParams.get('format')).toBe('jsonv2');
    expect(parsed.searchParams.get('limit')).toBe('1');
    expect(init.signal).toBeDefined();
  });

  it('skips addresses too short to mean anything', async () => {
    const { service } = create();

    await expect(service.geocode(' 10 ')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers the same address from cache regardless of case and spacing', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ lat: '43.2383', lon: '76.9453' }]));
    const { service, cache } = create();

    await service.geocode('г. Алматы, ул. Абая 10');
    await expect(service.geocode('Г. АЛМАТЫ,  УЛ. АБАЯ 10')).resolves.toEqual({
      lat: 43.2383,
      lng: 76.9453,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [key, , ttl] = cache.set.mock.calls[0];
    expect(key).toMatch(/^geocode:v1:[0-9a-f]{64}$/);
    expect(ttl).toBe(30 * DAY_MS);
  });

  it('remembers a definite miss for a day', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    const { service, cache } = create();

    await expect(service.geocode('nowhere street 404')).resolves.toBeNull();
    await expect(service.geocode('nowhere street 404')).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cache.set.mock.calls[0][1]).toEqual({ miss: true });
    expect(cache.set.mock.calls[0][2]).toBe(DAY_MS);
  });

  it('does not cache failures, so the next upload retries', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: 'busy' }, 503))
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonResponse([{ lat: '43.2383', lon: '76.9453' }]));
    const { service, cache } = create();

    await expect(service.geocode('г. Алматы, ул. Абая 10')).resolves.toBeNull();
    await expect(service.geocode('г. Алматы, ул. Абая 10')).resolves.toBeNull();
    await expect(service.geocode('г. Алматы, ул. Абая 10')).resolves.toEqual({
      lat: 43.2383,
      lng: 76.9453,
    });

    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('Geocoding request failed: http_503');
    expect(warnSpy).toHaveBeenCalledWith('Geocoding request failed: network');
  });

  it('reports a timeout without the address', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'TimeoutError' }));
    const { service } = create({ GEOCODER_URL: 'http://nominatim:8080', GEOCODER_TIMEOUT_MS: '50' });

    await expect(service.geocode('г. Алматы, ул. Абая 10')).resolves.toBeNull();

    expect(warnSpy).toHaveBeenCalledWith('Geocoding request failed: timeout');
    expect(JSON.stringify(warnSpy.mock.calls)).not.toMatch(/абая/i);
  });

  it('rejects coordinates outside the valid range', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ lat: '91', lon: '76.9' }]));
    const { service } = create();

    await expect(service.geocode('г. Алматы, ул. Абая 10')).resolves.toBeNull();
  });

  it('keeps working when the cache is down', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ lat: '43.2383', lon: '76.9453' }]));
    const cache = makeCache();
    cache.get.mockRejectedValue(new Error('redis down'));
    cache.set.mockRejectedValue(new Error('redis down'));
    const { service } = create(undefined, cache);

    await expect(service.geocode('г. Алматы, ул. Абая 10')).resolves.toEqual({
      lat: 43.2383,
      lng: 76.9453,
    });
  });
});
