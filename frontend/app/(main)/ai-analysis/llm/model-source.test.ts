import { prebuiltAppConfig } from '@mlc-ai/web-llm';
import { describe, expect, it } from 'vitest';
import { MODEL_CATALOG, RECOMMENDED_MODEL_ID } from '../model-catalog';
import { MODEL_PROXY_PATH, buildProxiedAppConfig, modelProxyBaseUrl } from './model-source';

const catalogIds = MODEL_CATALOG.map(entry => entry.modelId);

describe('buildProxiedAppConfig', () => {
  it('keeps only the requested models', () => {
    const config = buildProxiedAppConfig([RECOMMENDED_MODEL_ID]);

    expect(config.model_list.map(model => model.model_id)).toEqual([RECOMMENDED_MODEL_ID]);
  });

  it('drops ids the runtime does not know, instead of emitting unusable entries', () => {
    const config = buildProxiedAppConfig(['not-a-real-model']);

    expect(config.model_list).toEqual([]);
  });

  it('routes both weights and wasm through the proxy, never upstream', () => {
    const config = buildProxiedAppConfig(catalogIds);

    expect(config.model_list).toHaveLength(catalogIds.length);
    for (const model of config.model_list) {
      expect(model.model.startsWith(modelProxyBaseUrl())).toBe(true);
      expect(model.model_lib.startsWith(modelProxyBaseUrl())).toBe(true);
      expect(model.model).not.toContain('huggingface.co');
      expect(model.model_lib).not.toContain('githubusercontent.com');
    }
  });

  it('separates weights and lib so the proxy can pick the right upstream template', () => {
    const [model] = buildProxiedAppConfig([RECOMMENDED_MODEL_ID]).model_list;

    expect(model.model).toContain(`/${MODEL_PROXY_PATH}/`);
    expect(model.model).toContain('/weights/');
    expect(model.model_lib).toContain('/lib/');
  });

  it('preserves the upstream path so the proxy can rebuild it verbatim', () => {
    const upstream = prebuiltAppConfig.model_list.find(
      model => model.model_id === RECOMMENDED_MODEL_ID,
    );
    const [proxied] = buildProxiedAppConfig([RECOMMENDED_MODEL_ID]).model_list;

    const upstreamPath = new URL(upstream?.model_lib ?? '').pathname.replace(/^\/+/, '');
    expect(proxied.model_lib.endsWith(upstreamPath)).toBe(true);
  });

  it('escapes the model id so it cannot inject extra path segments', () => {
    const config = buildProxiedAppConfig(catalogIds);

    for (const model of config.model_list) {
      const afterBase = model.model.slice(`${modelProxyBaseUrl()}/`.length);
      expect(afterBase.split('/')[0]).toBe(encodeURIComponent(model.model_id));
    }
  });
});
