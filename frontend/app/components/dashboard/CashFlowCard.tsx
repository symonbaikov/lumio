'use client';

import { fillTemplate } from '@/app/(main)/dashboard/helpers/dashboard-helpers';
import type { DashboardCashFlowPoint } from '@/app/hooks/useDashboard';
import { useIntlayer } from '@/app/i18n';
import type React from 'react';
import { CashFlowMini } from './CashFlowMini';
import { DashboardCard } from './ui';

interface CashFlowCardProps {
  data: DashboardCashFlowPoint[];
  /** Human month label, e.g. "August 2026". */
  monthLabel: string;
}

export function CashFlowCard({ data, monthLabel }: CashFlowCardProps): React.JSX.Element {
  const t = useIntlayer('cashFlowCard');
  return (
    <DashboardCard
      title={t.title}
      subtitle={fillTemplate(t.subtitle.value, { range: monthLabel })}
      className="lumio-dashboard__cashflow-card"
    >
      <div className="lumio-dashboard__chart">
        <CashFlowMini
          data={data}
          emptyLabel={t.empty.value}
          incomeLabel={t.income.value}
          expenseLabel={t.expense.value}
        />
      </div>
    </DashboardCard>
  );
}
