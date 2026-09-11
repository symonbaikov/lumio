'use client';

import { PayablesView } from '../components/payables/PayablesView';
import StatementsSidePanel from '../components/StatementsSidePanel';

export default function StatementsReceivePage() {
  return (
    <>
      <StatementsSidePanel activeItem="receive" />
      <PayablesView direction="receivable" />
    </>
  );
}
