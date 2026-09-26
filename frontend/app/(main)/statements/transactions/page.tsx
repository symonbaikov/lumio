'use client';

import { TransactionTab } from '@/app/components/dashboard/TransactionTab';

export default function StatementTransactionsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 32 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--foreground)' }}>Transactions</h1>
        <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginTop: 4 }}>
          Review, categorise and manage all transactions
        </p>
      </div>
      <TransactionTab />
    </div>
  );
}
