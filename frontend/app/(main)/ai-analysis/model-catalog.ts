import { prebuiltAppConfig } from '@mlc-ai/web-llm';

/**
 * Editorial layer over WebLLM's prebuilt model list.
 *
 * Numeric facts (VRAM, context window) are read from `prebuiltAppConfig` at runtime
 * so they cannot drift when the package is upgraded. Only judgement calls live here.
 *
 * `russianQuality` and `speedTier` are provisional estimates. They must be replaced
 * with measured values from the phase 0 spike before this list is shown as advice.
 */

export type RussianQuality = 'good' | 'ok' | 'poor';
export type SpeedTier = 'fast' | 'balanced' | 'slow';

export interface CatalogEntry {
  modelId: string;
  displayName: string;
  paramsB: number;
  license: string;
  russianQuality: RussianQuality;
  speedTier: SpeedTier;
}

export interface ResolvedModel extends CatalogEntry {
  vramRequiredMB: number;
  contextTokens: number;
  lowResource: boolean;
}

export const RECOMMENDED_MODEL_ID = 'Qwen3.5-4B-q4f16_1-MLC';

export const MODEL_CATALOG: CatalogEntry[] = [
  {
    modelId: 'gemma3-1b-it-q4f16_1-MLC',
    displayName: 'Gemma 3 1B',
    paramsB: 1,
    license: 'Gemma Terms of Use',
    russianQuality: 'poor',
    speedTier: 'fast',
  },
  {
    modelId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    displayName: 'Llama 3.2 3B',
    paramsB: 3,
    license: 'Llama 3.2 Community License',
    russianQuality: 'ok',
    speedTier: 'fast',
  },
  {
    modelId: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    displayName: 'Qwen 2.5 3B',
    paramsB: 3,
    license: 'Qwen Research License',
    russianQuality: 'ok',
    speedTier: 'fast',
  },
  {
    modelId: 'Qwen3.5-2B-q4f16_1-MLC',
    displayName: 'Qwen 3.5 2B',
    paramsB: 2,
    license: 'Apache-2.0',
    russianQuality: 'ok',
    speedTier: 'fast',
  },
  {
    modelId: 'Qwen3.5-4B-q4f16_1-MLC',
    displayName: 'Qwen 3.5 4B',
    paramsB: 4,
    license: 'Apache-2.0',
    russianQuality: 'good',
    speedTier: 'balanced',
  },
  {
    modelId: 'Qwen3.5-9B-q4f16_1-MLC',
    displayName: 'Qwen 3.5 9B',
    paramsB: 9,
    license: 'Apache-2.0',
    russianQuality: 'good',
    speedTier: 'slow',
  },
];

function findPrebuilt(modelId: string) {
  return prebuiltAppConfig.model_list.find(model => model.model_id === modelId);
}

/**
 * Merges editorial entries with the numeric facts from WebLLM.
 * Entries missing from `prebuiltAppConfig` are dropped rather than shown with
 * fabricated numbers — a package upgrade that removes a model must not surface
 * a card the runtime cannot actually load.
 */
export function resolveCatalog(): ResolvedModel[] {
  return MODEL_CATALOG.flatMap(entry => {
    const prebuilt = findPrebuilt(entry.modelId);
    if (!prebuilt) {
      return [];
    }

    return [
      {
        ...entry,
        vramRequiredMB: Math.round(prebuilt.vram_required_MB ?? 0),
        contextTokens: prebuilt.overrides?.context_window_size ?? 0,
        lowResource: prebuilt.low_resource_required ?? false,
      },
    ];
  });
}

/** True when the adapter reports enough headroom for the model's weights. */
export function fitsInBudget(model: ResolvedModel, availableVramMb: number | null): boolean | null {
  if (availableVramMb === null) {
    return null;
  }
  return availableVramMb >= model.vramRequiredMB;
}
