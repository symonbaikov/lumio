'use client';

import StatementsListView from '../components/StatementsListView';
import StatementsSidePanel from '../components/StatementsSidePanel';

export default function StatementsApprovePage() {
  return (
    <>
      <StatementsSidePanel activeItem="approve" />
      <StatementsListView stage="approve" />
    </>
  );
}
