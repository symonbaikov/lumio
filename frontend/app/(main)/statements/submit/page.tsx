'use client';

import StatementsListView from '../components/StatementsListView';
import StatementsSidePanel from '../components/StatementsSidePanel';

export default function StatementsSubmitPage() {
  return (
    <>
      <StatementsSidePanel activeItem="submit" />
      <StatementsListView stage="submit" />
    </>
  );
}
