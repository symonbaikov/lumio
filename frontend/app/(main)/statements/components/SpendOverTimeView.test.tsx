// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SpendOverTimeView from './SpendOverTimeView';

const viewportState = vi.hoisted(() => ({ isMobile: true }));
const fetchReportMock = vi.hoisted(() => vi.fn());
const pushMock = vi.hoisted(() => vi.fn());

const STORAGE_KEY = 'lumio-spend-over-time-filters';

const spendOverTimeI18n = {
  kpiHint: { value: 'No calculations yet' },
  emptyStateTitle: { value: 'No data in selected period' },
  emptyStateDescription: { value: 'Upload statements or change filters' },
  emptyStateUploadCta: { value: 'Go to statement upload' },
  emptyStateResetCta: { value: 'Reset all filters' },
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    spendOverTime: spendOverTimeI18n,
  }),
}));

vi.mock('@/app/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    currentWorkspace: {
      currency: 'EUR',
    },
  }),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="mock-echarts" />,
}));

vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
    },
  }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

vi.mock('@/app/hooks/useIsMobile', () => ({
  useIsMobile: () => viewportState.isMobile,
}));

vi.mock('@/app/lib/spend-over-time-api', () => ({
  fetchSpendOverTimeReport: fetchReportMock,
}));

vi.mock('@/app/(main)/statements/components/filters/TypeFilterDropdown', () => ({
  TypeFilterDropdown: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

vi.mock('@/app/(main)/statements/components/filters/GroupByFilterDropdown', () => ({
  GroupByFilterDropdown: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

vi.mock('@/app/(main)/statements/components/filters/StatusFilterDropdown', () => ({
  StatusFilterDropdown: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

vi.mock('@/app/(main)/statements/components/filters/DateFilterDropdown', () => ({
  DateFilterDropdown: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

vi.mock('@/app/(main)/statements/components/filters/FromFilterDropdown', () => ({
  FromFilterDropdown: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

vi.mock('@/app/(main)/statements/components/filters/ViewFilterDropdown', () => ({
  ViewFilterDropdown: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

vi.mock('@/app/(main)/statements/components/filters/FiltersDrawer', () => ({
  FiltersDrawer: () => null,
}));

vi.mock('@/app/components/LoadingAnimation', () => ({
  default: () => <div data-testid="loading-animation" />,
}));

describe('SpendOverTimeView mobile rendering', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    pushMock.mockReset();
    fetchReportMock.mockResolvedValue({
      totals: {
        expense: 102000,
        avgPerPeriod: 51000,
        count: 4,
        net: 27000,
      },
      points: [
        {
          period: '2026-01',
          label: 'Jan',
          income: 50000,
          expense: 30000,
          net: 20000,
          count: 2,
        },
        {
          period: '2026-02',
          label: 'Feb',
          income: 47000,
          expense: 72000,
          net: -25000,
          count: 2,
        },
      ],
    });
  });

  it('renders mobile points list instead of table on mobile', async () => {
    viewportState.isMobile = true;
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<SpendOverTimeView />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="spend-over-time-mobile-points"]')).toBeTruthy();
    expect(container.querySelector('table')).toBeNull();
  });

  it('renders table on desktop', async () => {
    viewportState.isMobile = false;
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<SpendOverTimeView />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector('table')).toBeTruthy();
    expect(container.querySelector('[data-testid="spend-over-time-mobile-points"]')).toBeNull();
  });

  it('shows chart empty-state and zero KPI helper text for empty periods', async () => {
    viewportState.isMobile = false;
    fetchReportMock.mockResolvedValue({
      totals: {
        expense: 0,
        avgPerPeriod: 0,
        count: 0,
        net: 0,
      },
      points: [
        {
          period: '2026-01',
          label: 'Jan',
          income: 0,
          expense: 0,
          net: 0,
          count: 0,
        },
      ],
    });

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<SpendOverTimeView />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain(spendOverTimeI18n.emptyStateTitle.value);
    expect(container.textContent).toContain(spendOverTimeI18n.emptyStateDescription.value);
    expect(container.textContent).toContain(spendOverTimeI18n.emptyStateUploadCta.value);
    expect(container.textContent).toContain(spendOverTimeI18n.emptyStateResetCta.value);
    expect(container.textContent).toContain(spendOverTimeI18n.kpiHint.value);
  });

  it('uses Flow naming and supports net flow', async () => {
    viewportState.isMobile = false;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        filters: { type: 'net' },
        groupBy: 'month',
        viewType: 'line',
        showTable: true,
      }),
    );

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<SpendOverTimeView />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Flow: Net');
    expect(container.textContent).not.toContain('Type: Expense');
  });

  it('supports yearly grouping and stacked chart view', async () => {
    viewportState.isMobile = false;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        filters: { type: 'all' },
        groupBy: 'year',
        viewType: 'stacked',
        showTable: true,
      }),
    );

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<SpendOverTimeView />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Group by: Year');
    expect(container.textContent).toContain('View: Stacked');
    expect(fetchReportMock).toHaveBeenCalledWith(expect.anything(), 'year');
  });
});
