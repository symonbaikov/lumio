import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LocalModelState } from '../llm/useLocalModel';
import { MODEL_CATALOG, RECOMMENDED_MODEL_ID } from '../model-catalog';
import { ModelCatalogTab } from './ModelCatalogTab';

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    modelTab: {
      provisionalNote: 'provisional',
      downloadHint: 'hint',
      labelContext: 'Context',
      labelVram: 'VRAM',
      labelLicense: 'License',
      labelRussian: 'Russian',
      labelSpeed: 'Speed',
      qualityGood: 'good',
      qualityOk: 'ok',
      qualityPoor: 'poor',
      speedFast: 'fast',
      speedBalanced: 'balanced',
      speedSlow: 'slow',
      badgeRecommended: 'Recommended',
      badgeFits: 'Fits',
      badgeMayNotFit: 'May not fit',
      webgpuUnsupported: 'No WebGPU',
      actionInstall: 'Install',
      actionCancel: 'Cancel',
      actionRemove: 'Remove',
      statusInstalled: 'Installed',
      errorOutOfSpace: 'Out of space',
      errorGeneric: 'Install failed',
    },
  }),
}));

// The preview browser has no WebGPU; pretend it does so the install controls
// are exercised rather than being disabled by the capability check.
vi.mock('../useWebGpuBudget', () => ({
  useWebGpuBudget: () => ({ status: 'ready', availableVramMB: 8192 }),
}));

const OTHER_MODEL_ID = MODEL_CATALOG.find(entry => entry.modelId !== RECOMMENDED_MODEL_ID)
  ?.modelId as string;

const IDLE: LocalModelState = {
  status: 'idle',
  progress: null,
  progressText: null,
  error: null,
  outOfSpace: false,
  activeModelId: null,
};

function renderTab(model: LocalModelState, onInstall = vi.fn()) {
  render(
    <ModelCatalogTab model={model} onInstall={onInstall} onCancel={vi.fn()} onRemove={vi.fn()} />,
  );
  return { onInstall };
}

function cardFor(modelId: string): HTMLElement {
  const entry = MODEL_CATALOG.find(item => item.modelId === modelId);
  const heading = screen.getByText(entry?.displayName as string);
  return heading.closest('div')?.parentElement as HTMLElement;
}

describe('ModelCatalogTab actions', () => {
  it('offers install on every model when nothing is running', () => {
    renderTab(IDLE);

    expect(screen.getAllByRole('button', { name: 'Install' })).toHaveLength(MODEL_CATALOG.length);
  });

  it('shows progress on the downloading model, not on the others', () => {
    renderTab({
      ...IDLE,
      status: 'downloading',
      progress: 0.42,
      progressText: 'fetching shard 3',
      activeModelId: RECOMMENDED_MODEL_ID,
    });

    expect(within(cardFor(RECOMMENDED_MODEL_ID)).getByText('fetching shard 3')).toBeTruthy();
    expect(within(cardFor(OTHER_MODEL_ID)).queryByText('fetching shard 3')).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('blocks starting a second download while one is running', () => {
    renderTab({
      ...IDLE,
      status: 'downloading',
      activeModelId: RECOMMENDED_MODEL_ID,
    });

    for (const button of screen.getAllByRole('button', { name: 'Install' })) {
      expect(button).toBeDisabled();
    }
  });

  it('marks only the installed model as installed', () => {
    renderTab({ ...IDLE, status: 'ready', progress: 1, activeModelId: RECOMMENDED_MODEL_ID });

    expect(within(cardFor(RECOMMENDED_MODEL_ID)).getByText('Installed')).toBeTruthy();
    expect(within(cardFor(OTHER_MODEL_ID)).getByRole('button', { name: 'Install' })).toBeTruthy();
  });

  it('reports a full disk distinctly from other failures', () => {
    renderTab({
      ...IDLE,
      status: 'error',
      outOfSpace: true,
      error: 'QuotaExceededError',
      activeModelId: RECOMMENDED_MODEL_ID,
    });

    expect(screen.getByText('Out of space')).toBeTruthy();
    expect(screen.queryByText('Install failed')).toBeNull();
  });
});
