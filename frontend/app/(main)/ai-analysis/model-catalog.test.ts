import { prebuiltAppConfig } from '@mlc-ai/web-llm';
import { describe, expect, it } from 'vitest';
import { MODEL_CATALOG, RECOMMENDED_MODEL_ID, fitsInBudget, resolveCatalog } from './model-catalog';

describe('MODEL_CATALOG', () => {
  it('only lists models WebLLM can actually load', () => {
    const prebuiltIds = new Set(prebuiltAppConfig.model_list.map(model => model.model_id));
    const missing = MODEL_CATALOG.filter(entry => !prebuiltIds.has(entry.modelId));

    expect(missing.map(entry => entry.modelId)).toEqual([]);
  });

  it('recommends a model that is in the catalog', () => {
    expect(MODEL_CATALOG.map(entry => entry.modelId)).toContain(RECOMMENDED_MODEL_ID);
  });

  it('has no duplicate entries', () => {
    const ids = MODEL_CATALOG.map(entry => entry.modelId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolveCatalog', () => {
  it('fills numeric facts from the WebLLM config', () => {
    const resolved = resolveCatalog();

    expect(resolved).toHaveLength(MODEL_CATALOG.length);
    for (const model of resolved) {
      expect(model.vramRequiredMB).toBeGreaterThan(0);
      expect(model.contextTokens).toBeGreaterThan(0);
    }
  });

  it('caps context at what the runtime offers, so prompts can be budgeted', () => {
    const maxContext = Math.max(...resolveCatalog().map(model => model.contextTokens));

    expect(maxContext).toBeLessThanOrEqual(4096);
  });
});

describe('fitsInBudget', () => {
  const model = resolveCatalog()[0];

  it('returns null when the GPU budget is unknown', () => {
    expect(fitsInBudget(model, null)).toBeNull();
  });

  it('compares against the reported budget', () => {
    expect(fitsInBudget(model, model.vramRequiredMB + 1)).toBe(true);
    expect(fitsInBudget(model, model.vramRequiredMB - 1)).toBe(false);
  });
});
