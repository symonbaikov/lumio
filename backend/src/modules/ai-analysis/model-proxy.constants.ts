/**
 * Security boundary for the model weight proxy.
 *
 * Nothing here may be derived from a request. The host is fixed per kind, the
 * path prefix is rebuilt from the validated model id, and only ids in
 * ALLOWED_MODEL_IDS are served. A request for anything else must 404 without
 * any outbound call being made.
 *
 * This list intentionally duplicates the frontend catalog rather than importing
 * it: the allowlist is what stops the endpoint being an open proxy, so it must
 * hold even if the UI is changed or bypassed. Drift shows up as a model that
 * renders in the UI but 404s here — visible, and safe in the right direction.
 */

export const ALLOWED_MODEL_IDS: readonly string[] = [
  'gemma3-1b-it-q4f16_1-MLC',
  'Llama-3.2-3B-Instruct-q4f16_1-MLC',
  'Qwen2.5-3B-Instruct-q4f16_1-MLC',
  'Qwen3.5-2B-q4f16_1-MLC',
  'Qwen3.5-4B-q4f16_1-MLC',
  'Qwen3.5-9B-q4f16_1-MLC',
];

export type ModelAssetKind = 'weights' | 'lib';

export const MODEL_ASSET_KINDS: readonly ModelAssetKind[] = ['weights', 'lib'];

/** Fixed origin per asset kind. Never taken from the request. */
export const UPSTREAM_ORIGIN: Record<ModelAssetKind, string> = {
  weights: 'https://huggingface.co',
  lib: 'https://raw.githubusercontent.com',
};

/**
 * Prefix the remainder path must start with, so a valid model id cannot be used
 * to reach an unrelated repository on the same host.
 */
export function expectedPathPrefix(kind: ModelAssetKind, modelId: string): string {
  return kind === 'weights' ? `mlc-ai/${modelId}/` : 'mlc-ai/binary-mlc-llm-libs/';
}
