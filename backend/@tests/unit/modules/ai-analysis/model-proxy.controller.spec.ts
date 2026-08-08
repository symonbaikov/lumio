import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Writable } from 'node:stream';
import { NotFoundException } from '@nestjs/common';
import { ModelProxyController } from '../../../../src/modules/ai-analysis/model-proxy.controller';
import { ModelProxyService } from '../../../../src/modules/ai-analysis/model-proxy.service';

const MODEL_ID = 'Qwen3.5-4B-q4f16_1-MLC';
const WEIGHTS_PATH = ['mlc-ai', MODEL_ID, 'resolve', 'main', 'params_shard_0.bin'];

/**
 * A real Writable so `stream.pipeline` behaves exactly as it does against an
 * Express response, with the few response methods the controller uses bolted on.
 */
function createResponse() {
  const chunks: Buffer[] = [];

  const res = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.from(chunk));
      callback();
    },
  }) as Writable & {
    headers: Record<string, string>;
    statusCode: number;
    sentFile: string | null;
    setHeader(name: string, value: string): void;
    sendFile(filePath: string): void;
    status(code: number): unknown;
    body(): string;
  };

  res.headers = {};
  res.statusCode = 200;
  res.sentFile = null;
  res.setHeader = (name, value) => {
    res.headers[name] = value;
  };
  res.sendFile = filePath => {
    res.sentFile = filePath;
  };
  res.status = code => {
    res.statusCode = code;
    return res;
  };
  res.body = () => Buffer.concat(chunks).toString();

  return res;
}

describe('ModelProxyController', () => {
  const originalFetch = global.fetch;
  const originalRoot = process.env.AI_MODEL_CACHE_ROOT;
  let cacheRoot: string;
  let controller: ModelProxyController;
  let service: ModelProxyService;

  beforeEach(async () => {
    cacheRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'model-proxy-'));
    process.env.AI_MODEL_CACHE_ROOT = cacheRoot;
    service = new ModelProxyService();
    controller = new ModelProxyController(service);
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    if (originalRoot === undefined) {
      delete process.env.AI_MODEL_CACHE_ROOT;
    } else {
      process.env.AI_MODEL_CACHE_ROOT = originalRoot;
    }
    await fs.rm(cacheRoot, { recursive: true, force: true });
  });

  it('makes no outbound request for a model outside the allowlist', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      controller.getAsset('evil-model', 'weights', WEIGHTS_PATH, createResponse() as never),
    ).rejects.toThrow(NotFoundException);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes no outbound request for a traversal attempt', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      controller.getAsset(
        MODEL_ID,
        'weights',
        ['mlc-ai', MODEL_ID, '..', '..', 'etc', 'passwd'],
        createResponse() as never,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('serves a cached file without touching the upstream', async () => {
    const { cachePath } = service.resolve(MODEL_ID, 'weights', WEIGHTS_PATH);
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, 'cached-bytes');

    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const res = createResponse();

    await controller.getAsset(MODEL_ID, 'weights', WEIGHTS_PATH, res as never);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.sentFile).toBe(cachePath);
  });

  it('streams to the client and fills the cache on a miss', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response('weight-bytes', {
        status: 200,
        headers: { 'content-length': '12', 'content-type': 'application/octet-stream' },
      }),
    ) as unknown as typeof fetch;

    const res = createResponse();
    await controller.getAsset(MODEL_ID, 'weights', WEIGHTS_PATH, res as never);

    expect(res.body()).toBe('weight-bytes');
    // Passed through so the browser can render a progress bar.
    expect(res.headers['Content-Length']).toBe('12');

    const { cachePath } = service.resolve(MODEL_ID, 'weights', WEIGHTS_PATH);
    await expect(fs.readFile(cachePath, 'utf8')).resolves.toBe('weight-bytes');
  });

  it('leaves no cache entry behind when the upstream fails', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('nope', { status: 404 })) as unknown as typeof fetch;

    await expect(
      controller.getAsset(MODEL_ID, 'weights', WEIGHTS_PATH, createResponse() as never),
    ).rejects.toThrow(NotFoundException);

    const { cachePath } = service.resolve(MODEL_ID, 'weights', WEIGHTS_PATH);
    await expect(fs.stat(cachePath)).rejects.toThrow();
  });
});
