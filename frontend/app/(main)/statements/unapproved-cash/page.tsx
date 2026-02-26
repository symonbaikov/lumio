'use client';

import StatementsSidePanel from '../components/StatementsSidePanel';
import UnapprovedCashView from '../components/UnapprovedCashView';

export default function StatementsUnapprovedCashPage() {
  return (
    <>
      <StatementsSidePanel activeItem="unapproved-cash" />
      <UnapprovedCashView />
    </>
  );
}
