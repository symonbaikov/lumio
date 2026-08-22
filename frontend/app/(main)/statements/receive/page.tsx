'use client';

import StatementsSidePanel from '../components/StatementsSidePanel';
import { PayablesView } from '../components/payables/PayablesView';

export default function StatementsReceivePage() {
  return (
    <>
      <StatementsSidePanel activeItem="receive" />
      <PayablesView direction="receivable" />
    </>
  );
}
