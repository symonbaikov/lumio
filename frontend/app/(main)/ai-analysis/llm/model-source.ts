import { apiBaseUrl } from '@/app/lib/api';
import { type AppConfig, prebuiltAppConfig } from '@mlc-ai/web-llm';

/**
 * WebLLM fetches weights from huggingface.co and the compiled wasm from
 * raw.githubusercontent.com. Neither is reachable in a closed self-hosted network,
 * and neither should be hit directly by every user's browser anyway.
 *
 * This rewrites both to the backend proxy so there is exactly one path to the
 * weights on every platform. The proxy validates ids against the same catalog,
 * so an id absent from it will 404 rather than reach any upstream.
 */

/** Path segment the backend proxy is mounted on, relative to the API base. */
export const MODEL_PROXY_PATH = 'ai-analysis/models';

export function modelProxyBaseUrl(): string {
  return `${apiBaseUrl.replace(/\/+$/, '')}/${MODEL_PROXY_PATH}`;
}

/**
 * Rewrites an upstream URL to `<proxy>/<modelId>/<kind>/<remainder>`.
 * The remainder keeps the upstream's own path so the proxy can rebuild it
 * from a server-side template without ever trusting a client-supplied URL.
 */
function toProxyUrl(upstream: string, modelId: string, kind: 'weights' | 'lib'): string {
  const { pathname } = new URL(upstream);
  const remainder = pathname.replace(/^\/+/, '');

  return `${modelProxyBaseUrl()}/${encodeURIComponent(modelId)}/${kind}/${remainder}`;
}

/**
 * Builds an AppConfig limited to the given model ids, with every upstream
 * rewritten to the proxy. Ids missing from `prebuiltAppConfig` are dropped —
 * the runtime cannot load them, so offering them would only fail later.
 */
export function buildProxiedAppConfig(modelIds: string[]): AppConfig {
  const wanted = new Set(modelIds);

  const modelList = prebuiltAppConfig.model_list
    .filter(model => wanted.has(model.model_id))
    .map(model => ({
      ...model,
      model: toProxyUrl(model.model, model.model_id, 'weights'),
      model_lib: toProxyUrl(model.model_lib, model.model_id, 'lib'),
    }));

  return { ...prebuiltAppConfig, model_list: modelList };
}
