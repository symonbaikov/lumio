import { NotFoundException } from '@nestjs/common';
import { ModelProxyService } from '../../../../src/modules/ai-analysis/model-proxy.service';

const MODEL_ID = 'Qwen3.5-4B-q4f16_1-MLC';
const WEIGHTS_PATH = ['mlc-ai', MODEL_ID, 'resolve', 'main', 'params_shard_0.bin'];
const LIB_PATH = [
  'mlc-ai',
  'binary-mlc-llm-libs',
  'main',
  'web-llm-models',
  'v0_2_84',
  'base',
  'Qwen3.5-4B-q4f16_1_cs1k-webgpu.wasm',
];

describe('ModelProxyService.resolve', () => {
  const service = new ModelProxyService();

  it('builds the upstream URL from a fixed origin, not from the request', () => {
    const resolved = service.resolve(MODEL_ID, 'weights', WEIGHTS_PATH);

    expect(resolved.upstreamUrl).toBe(
      `https://huggingface.co/mlc-ai/${MODEL_ID}/resolve/main/params_shard_0.bin`,
    );
  });

  it('sends wasm to the binary-libs host rather than the weights host', () => {
    const resolved = service.resolve(MODEL_ID, 'lib', LIB_PATH);

    expect(resolved.upstreamUrl.startsWith('https://raw.githubusercontent.com/')).toBe(true);
  });

  it('rejects a model outside the allowlist', () => {
    expect(() => service.resolve('evil-model', 'weights', WEIGHTS_PATH)).toThrow(NotFoundException);
  });

  it('rejects an unknown asset kind', () => {
    expect(() => service.resolve(MODEL_ID, 'config', WEIGHTS_PATH)).toThrow(NotFoundException);
  });

  it('refuses a path belonging to a different repository on the allowed host', () => {
    expect(() =>
      service.resolve(MODEL_ID, 'weights', ['someone-else', 'private-repo', 'secret.bin']),
    ).toThrow(NotFoundException);
  });

  it('refuses a path for another allowlisted model', () => {
    expect(() =>
      service.resolve(MODEL_ID, 'weights', ['mlc-ai', 'Qwen3.5-9B-q4f16_1-MLC', 'x.bin']),
    ).toThrow(NotFoundException);
  });

  it.each([
    ['parent traversal', ['mlc-ai', MODEL_ID, '..', '..', '..', 'etc', 'passwd']],
    ['current dir', ['mlc-ai', MODEL_ID, '.', 'x.bin']],
    ['absolute path', ['/etc', 'passwd']],
    ['embedded separator', ['mlc-ai', `${MODEL_ID}/../..`, 'x.bin']],
    ['backslash separator', ['mlc-ai', MODEL_ID, '..\\..\\x.bin']],
    ['null byte', ['mlc-ai', MODEL_ID, 'x.bin\0.txt']],
    ['empty segment', ['mlc-ai', MODEL_ID, '', 'x.bin']],
    ['no path at all', []],
  ])('rejects %s', (_label, segments) => {
    expect(() => service.resolve(MODEL_ID, 'weights', segments as string[])).toThrow(
      NotFoundException,
    );
  });

  it('keeps the cache path inside the cache root', () => {
    const resolved = service.resolve(MODEL_ID, 'weights', WEIGHTS_PATH);

    expect(resolved.cachePath.startsWith(service.cacheRoot())).toBe(true);
  });
});

describe('ModelProxyService.fetchUpstream', () => {
  const service = new ModelProxyService();
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('does not follow a redirect that leaves the allowed origins', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'https://attacker.example/steal' },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(service.fetchUpstream('https://huggingface.co/mlc-ai/x/y.bin')).rejects.toThrow(
      NotFoundException,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('follows a redirect that stays on an allowed origin', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: 'https://huggingface.co/mlc-ai/x/actual.bin' },
        }),
      )
      .mockResolvedValueOnce(new Response('payload', { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await service.fetchUpstream('https://huggingface.co/mlc-ai/x/y.bin');

    expect(await response.text()).toBe('payload');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never sends the request with automatic redirect following', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await service.fetchUpstream('https://huggingface.co/mlc-ai/x/y.bin');

    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), { redirect: 'manual' });
  });
});
