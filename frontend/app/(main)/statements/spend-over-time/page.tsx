'use client';

import SpendOverTimeView from '@/app/(main)/statements/components/SpendOverTimeView';
import StatementsSidePanel from '@/app/(main)/statements/components/StatementsSidePanel';

export default function StatementsSpendOverTimePage() {
  return (
    <>
      <StatementsSidePanel activeItem="spend-over-time" />
      <SpendOverTimeView />
    </>
  );
}
