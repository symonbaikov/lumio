'use client';

import StatementsSidePanel from '@/app/(main)/statements/components/StatementsSidePanel';
import SpendOverTimeView from '@/app/(main)/statements/components/SpendOverTimeView';

export default function StatementsSpendOverTimePage() {
  return (
    <>
      <StatementsSidePanel activeItem="spend-over-time" />
      <SpendOverTimeView />
    </>
  );
}
