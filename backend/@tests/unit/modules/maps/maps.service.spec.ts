import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { MapsService } from '@/modules/maps/maps.service';

const makeCache = () => {
  const store = new Map<string, unknown>();
  return {
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

const STYLES = [
  { id: 'osm-bright', name: 'OSM Bright', url: 'http://tileserver:8080/styles/osm-bright/style.json' },
  { id: 'dark-matter', name: 'Dark Matter' },
  { id: '../../etc', name: 'Traversal' },
  { name: 'No id' },
];

describe('MapsService', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  let warnSpy: jest.SpyInstance;

  const create = (
    values: Record<string, string | undefined> = { TILESERVER_URL: 'http://tileserver:8080/' },
    cache = makeCache(),
  ) => ({ service: new MapsService(cache as unknown as Cache, makeConfig(values)), cache });

  const routeFetch = (tile: Partial<Response> | Error = {}) =>
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/styles.json')) {
        return jsonResponse(STYLES);
      }
      if (tile instanceof Error) {
        throw tile;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'image/png' }),
        arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
        ...tile,
      };
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

  describe('getStyles', () => {
    it('offers nothing when no tile server is configured', async () => {
      const { service } = create({});

      await expect(service.getStyles()).resolves.toEqual({ styles: [], defaultStyleId: null });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('lists well-formed styles and defaults to the first one', async () => {
      routeFetch();
      const { service } = create();

      await expect(service.getStyles()).resolves.toEqual({
        styles: [
          { id: 'osm-bright', name: 'OSM Bright' },
          { id: 'dark-matter', name: 'Dark Matter' },
        ],
        defaultStyleId: 'osm-bright',
      });
      expect(fetchMock).toHaveBeenCalledWith('http://tileserver:8080/styles.json', expect.anything());
    });

    it('honours MAP_DEFAULT_STYLE only when the server offers it', async () => {
      routeFetch();

      const configured = create({
        TILESERVER_URL: 'http://tileserver:8080',
        MAP_DEFAULT_STYLE: 'dark-matter',
      });
      await expect(configured.service.getStyles()).resolves.toMatchObject({
        defaultStyleId: 'dark-matter',
      });

      const unknown = create({ TILESERVER_URL: 'http://tileserver:8080', MAP_DEFAULT_STYLE: 'nope' });
      await expect(unknown.service.getStyles()).resolves.toMatchObject({
        defaultStyleId: 'osm-bright',
      });
    });

    it('caches the style list for ten minutes', async () => {
      routeFetch();
      const { service, cache } = create();

      await service.getStyles();
      await service.getStyles();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(cache.set).toHaveBeenCalledWith('maps:styles:v1', expect.any(Array), 10 * 60 * 1000);
    });

    it('does not cache a failed or empty answer', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ error: 'starting' }, 503))
        .mockResolvedValueOnce(jsonResponse([]));
      const { service, cache } = create();

      await expect(service.getStyles()).resolves.toMatchObject({ styles: [] });
      await expect(service.getStyles()).resolves.toMatchObject({ styles: [] });

      expect(cache.set).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('Map styles request failed: http_503');
    });
  });

  describe('fetchTile', () => {
    it('proxies a raster tile of an advertised style', async () => {
      routeFetch();
      const { service } = create();

      const tile = await service.fetchTile('osm-bright', '3', '1', '2.png');

      expect(tile).toEqual({
        status: 'ok',
        body: Buffer.from([137, 80, 78, 71]),
        contentType: 'image/png',
      });
      expect(fetchMock).toHaveBeenLastCalledWith(
        'http://tileserver:8080/styles/osm-bright/3/1/2.png',
        expect.objectContaining({ signal: expect.anything() }),
      );
    });

    it.each([
      ['an unknown style', 'satellite', '3', '1', '2.png'],
      ['a zoom beyond the grid', 'osm-bright', '23', '0', '0.png'],
      ['a column outside the zoom level', 'osm-bright', '2', '4', '0.png'],
      ['a non-numeric coordinate', 'osm-bright', '2', '1e1', '0.png'],
      ['a negative coordinate', 'osm-bright', '2', '-1', '0.png'],
    ])('rejects %s without calling the tile endpoint', async (_label, style, z, x, y) => {
      routeFetch();
      const { service } = create();

      await expect(service.fetchTile(style, z, x, y)).resolves.toEqual({ status: 'invalid' });
      expect(fetchMock.mock.calls.every(([url]) => String(url).endsWith('/styles.json'))).toBe(
        true,
      );
    });

    it('reports an upstream error as unavailable', async () => {
      routeFetch({ ok: false, status: 500 });
      const { service } = create();

      await expect(service.fetchTile('osm-bright', '0', '0', '0.png')).resolves.toEqual({
        status: 'unavailable',
      });
      expect(warnSpy).toHaveBeenCalledWith('Tile request failed: http_500');
    });

    it('reports a timeout as unavailable', async () => {
      routeFetch(Object.assign(new Error('aborted'), { name: 'TimeoutError' }));
      const { service } = create();

      await expect(service.fetchTile('osm-bright', '0', '0', '0.png')).resolves.toEqual({
        status: 'unavailable',
      });
      expect(warnSpy).toHaveBeenCalledWith('Tile request failed: timeout');
    });

    it('treats tiles as invalid when maps are disabled', async () => {
      const { service } = create({});

      await expect(service.fetchTile('osm-bright', '0', '0', '0.png')).resolves.toEqual({
        status: 'invalid',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
