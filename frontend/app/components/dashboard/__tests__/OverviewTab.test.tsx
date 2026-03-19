import type { DashboardData } from '@/app/hooks/useDashboard';
// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { OverviewTab } from '../OverviewTab';

const emptyDashboardData: DashboardData = {
  snapshot: {
    totalBalance: 0,
    income30d: 0,
    expense30d: 0,
    netFlow30d: 0,
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
  role: 'owner',
  range: '30d',
  dataHealth: {
    uncategorizedTransactions: 0,
    statementsWithErrors: 0,
    statementsPendingReview: 0,
    unapprovedCash: 0,
    lastUploadDate: null,
    parsingWarnings: 0,
  },
};

describe('OverviewTab', () => {
  it('renders formatted snapshot amounts without duplicating currency code', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <OverviewTab
          data={{
            ...emptyDashboardData,
            snapshot: {
              ...emptyDashboardData.snapshot,
              totalBalance: 1025215,
            },
          }}
          formatAmount={() => 'KZT 1,025,215'}
          range="30d"
          isLoading={false}
        />,
      );
    });

    expect(container.textContent).toContain('KZT 1,025,215');
    expect(container.textContent).not.toContain('KZT KZT 1,025,215');
  });

  it('links parse statement CTA to statements with scan drawer', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <OverviewTab
          data={emptyDashboardData}
          formatAmount={value => String(value)}
          range="30d"
          isLoading={false}
        />,
      );
    });

    const parseLink = Array.from(container.querySelectorAll('a')).find(link =>
      link.textContent?.includes('Parse statement'),
    );

    expect(parseLink).toBeTruthy();
    expect(parseLink?.getAttribute('href')).toBe('/statements?openExpenseDrawer=scan');
  });
});
