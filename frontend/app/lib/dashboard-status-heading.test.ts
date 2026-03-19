import { describe, expect, it } from 'vitest';
import type { DashboardData } from '@/app/hooks/useDashboard';
import { resolveDashboardStatusHeading } from './dashboard-status-heading';

const createDashboardData = (overrides?: Partial<DashboardData>): DashboardData => ({
  snapshot: {
    totalBalance: 1_025_215,
    income30d: 0,
    expense30d: 0,
    netFlow30d: 0,
    totalPayable: 0,
    totalOverdue: 0,
    unapprovedCash: 0,
    currency: 'KZT',
    ...overrides?.snapshot,
  },
  actions: overrides?.actions ?? [],
  cashFlow: overrides?.cashFlow ?? [],
  topMerchants: overrides?.topMerchants ?? [],
  topCategories: overrides?.topCategories ?? [],
  recentActivity: overrides?.recentActivity ?? [],
  role: overrides?.role ?? 'owner',
  range: overrides?.range ?? '30d',
  dataHealth: {
    uncategorizedTransactions: 0,
    statementsWithErrors: 0,
    statementsPendingReview: 0,
    unapprovedCash: 0,
    lastUploadDate: '2026-03-19T00:00:00.000Z',
    parsingWarnings: 0,
    ...overrides?.dataHealth,
  },
});

describe('resolveDashboardStatusHeading', () => {
  it('returns allClear when there are no issues in current data', () => {
    const heading = resolveDashboardStatusHeading({
      data: createDashboardData(),
      error: null,
      loading: false,
      now: new Date('2026-03-19T00:00:00.000Z').getTime(),
    });

    expect(heading).toBe('allClear');
  });

  it('returns breakEven only when there is neutral flow with income', () => {
    const heading = resolveDashboardStatusHeading({
      data: createDashboardData({
        snapshot: {
          totalBalance: 1_025_215,
          income30d: 120_000,
          expense30d: 120_000,
          netFlow30d: 0,
          totalPayable: 0,
          totalOverdue: 0,
          unapprovedCash: 0,
          currency: 'KZT',
        },
      }),
      error: null,
      loading: false,
      now: new Date('2026-03-19T00:00:00.000Z').getTime(),
    });

    expect(heading).toBe('breakEven');
  });

  it('prioritizes overdue payments over other statuses', () => {
    const heading = resolveDashboardStatusHeading({
      data: createDashboardData({
        snapshot: {
          totalBalance: 1_025_215,
          income30d: 0,
          expense30d: 0,
          netFlow30d: 0,
          totalPayable: 0,
          totalOverdue: 2,
          unapprovedCash: 0,
          currency: 'KZT',
        },
        dataHealth: {
          uncategorizedTransactions: 4,
          statementsWithErrors: 0,
          statementsPendingReview: 1,
          unapprovedCash: 0,
          lastUploadDate: '2026-03-19T00:00:00.000Z',
          parsingWarnings: 1,
        },
      }),
      error: null,
      loading: false,
      now: new Date('2026-03-19T00:00:00.000Z').getTime(),
    });

    expect(heading).toBe('overdue');
  });
});
