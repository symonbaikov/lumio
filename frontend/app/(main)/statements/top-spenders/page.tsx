'use client';

import StatementsSidePanel from '../components/StatementsSidePanel';
import TopSpendersView from '../components/TopSpendersView';

export default function StatementsTopSpendersPage() {
  return (
    <>
      <StatementsSidePanel activeItem="top-spenders" />
      <TopSpendersView />
    </>
  );
}
