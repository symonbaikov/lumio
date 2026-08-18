import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/app/lib/api', () => ({
  default: {
    get: apiMocks.get,
    post: apiMocks.post,
  },
}));

vi.mock('@/app/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ currentWorkspace: { id: 'workspace-1' } }),
}));

import { type InsightSeverity, useInsights } from './useInsights';

type HookSnapshot = ReturnType<typeof useInsights>;

let latestHook: HookSnapshot | null = null;

function makeProbe(severities: InsightSeverity[], refreshFirst = false) {
  return function HookProbe() {
    latestHook = useInsights({ severities, refreshFirst });
    return <div data-testid="insights-hook-probe" />;
  };
}

function insight(id: string, severity: InsightSeverity) {
  return {
    id,
    type: 'trend.savings_rate',
    category: 'trend',
    severity,
    title: `title-${id}`,
    message: `message-${id}`,
    messageKey: 'trend.savings_rate_down',
    messageParams: { rate: 10, diff: 9 },
    data: null,
    createdAt: '2026-08-01T00:00:00.000Z',
  };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

async function renderProbe(Probe: () => React.JSX.Element) {
  const root = createRoot(document.createElement('div'));
  await act(async () => {
    root.render(<Probe />);
    await flushPromises();
  });
  return root;
}

describe('useInsights', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    latestHook = null;
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.post.mockResolvedValue({ data: {} });
  });

  it('keeps only the requested severities, so alerts and advice stay apart', async () => {
    apiMocks.get.mockResolvedValue({
      data: {
        items: [insight('a', 'warn'), insight('b', 'info'), insight('c', 'critical')],
      },
    });

    await renderProbe(makeProbe(['warn', 'critical']));

    expect(latestHook?.items.map(item => item.id)).toEqual(['a', 'c']);
  });

  it('does not recompute insights when only reading them', async () => {
    apiMocks.get.mockResolvedValue({ data: { items: [] } });

    await renderProbe(makeProbe(['warn']));

    expect(apiMocks.post).not.toHaveBeenCalled();
  });

  it('recomputes first when the caller asks for a fresh read', async () => {
    apiMocks.get.mockResolvedValue({ data: { items: [] } });

    await renderProbe(makeProbe(['info'], true));

    expect(apiMocks.post).toHaveBeenCalledWith('/insights/refresh');
  });

  it('removes a dismissed insight from view before the server answers', async () => {
    apiMocks.get.mockResolvedValue({ data: { items: [insight('a', 'warn')] } });

    await renderProbe(makeProbe(['warn']));
    await act(async () => {
      void latestHook?.dismiss('a');
      await flushPromises();
    });

    expect(latestHook?.items).toEqual([]);
    expect(apiMocks.post).toHaveBeenCalledWith('/insights/a/dismiss');
  });

  it('shows an empty feed rather than failing the page when the request errors', async () => {
    apiMocks.get.mockRejectedValue(new Error('boom'));

    await renderProbe(makeProbe(['warn']));

    expect(latestHook?.items).toEqual([]);
    expect(latestHook?.loading).toBe(false);
  });
});
