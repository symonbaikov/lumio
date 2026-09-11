'use client';

import { PayablesView } from '../components/payables/PayablesView';
import StatementsSidePanel from '../components/StatementsSidePanel';

export default function StatementsPayPage() {
  return (
    <>
      <StatementsSidePanel activeItem="pay" />
      <PayablesView />
    </>
  );
}
