'use client';

import StatementsSidePanel from '../components/StatementsSidePanel';
import TopMerchantsView from '../components/TopMerchantsView';

export default function StatementsTopMerchantsPage() {
  return (
    <>
      <StatementsSidePanel activeItem="top-merchants" />
      <TopMerchantsView />
    </>
  );
}
