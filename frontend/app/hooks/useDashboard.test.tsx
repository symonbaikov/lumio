// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('@/app/lib/api', () => ({
  default: {
    get: apiMocks.get,
  },
}));

import { useDashboard } from './useDashboard';

type HookSnapshot = ReturnType<typeof useDashboard>;

let latestHook: HookSnapshot | null = null;

function HookProbe() {
  latestHook = useDashboard('30d');
  return <div data-testid="dashboard-hook-probe" />;
}

function createDashboardPayload(balance: number) {
  return {
    snapshot: {
      totalBalance: balance,
      income30d: 10,
      expense30d: 5,
      netFlow30d: 5,
      totalPayable: 0,
      totalOverdue: 0,
      unapprovedCash: 0,
      currency: 'KZT',
    },
    actions: [],
    cashFlow: [],
    topMerchants: [],
    topCategories: [],
    recentActivity: [],
    role: 'owner' as const,
    range: '30d' as const,
    dataHealth: {
      uncategorizedTransactions: 0,
      statementsWithErrors: 0,
      statementsPendingReview: 0,
      unapprovedCash: 0,
      lastUploadDate: null,
      parsingWarnings: 0,
    },
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('useDashboard', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    latestHook = null;
    apiMocks.get.mockReset();
  });

  it('loads dashboard once when backend returns effective window metadata', async () => {
    apiMocks.get.mockResolvedValue({
      data: {
        ...createDashboardPayload(100),
        effectiveSince: '2025-05-01',
        effectiveEndDate: '2025-05-31',
      },
    });

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<HookProbe />);
      await flushPromises();
    });

    expect(apiMocks.get).toHaveBeenCalledTimes(1);
    expect(apiMocks.get).toHaveBeenCalledWith('/dashboard', { params: { range: '30d' } });
    expect(latestHook?.data?.effectiveEndDate).toBe('2025-05-31');
    expect(latestHook?.targetDate).toBeNull();
  });

  it('performs a single fetch when user changes target date', async () => {
    apiMocks.get.mockResolvedValue({ data: createDashboardPayload(100) });

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<HookProbe />);
      await flushPromises();
    });

    apiMocks.get.mockClear();

    await act(async () => {
      latestHook?.changeTargetDate('2025-05-20');
      await flushPromises();
    });

    expect(apiMocks.get).toHaveBeenCalledTimes(1);
    expect(apiMocks.get).toHaveBeenCalledWith('/dashboard', {
      params: { range: '30d', date: '2025-05-20' },
    });
    expect(latestHook?.targetDate).toBe('2025-05-20');
  });

  it('ignores stale responses when a newer request resolves first', async () => {
    const first = createDeferred<{ data: ReturnType<typeof createDashboardPayload> }>();
    const second = createDeferred<{ data: ReturnType<typeof createDashboardPayload> }>();

    apiMocks.get.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<HookProbe />);
      await Promise.resolve();
    });

    await act(async () => {
      latestHook?.changeTargetDate('2025-05-20');
      await Promise.resolve();
    });

    await act(async () => {
      second.resolve({ data: createDashboardPayload(200) });
      await flushPromises();
    });

    await act(async () => {
      first.resolve({ data: createDashboardPayload(100) });
      await flushPromises();
    });

    expect(latestHook?.data?.snapshot.totalBalance).toBe(200);
  });
});
