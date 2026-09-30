'use client';

import { TransactionTab } from '@/app/components/dashboard/TransactionTab';
import { useIntlayer } from '@/app/i18n';

export default function StatementTransactionsPage() {
  const t = useIntlayer('statementTransactionsPage');
  return (
    // The /statements shell clips its last child, so every page there scrolls itself.
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        padding: 32,
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--foreground)' }}>{t.title}</h1>
        <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginTop: 4 }}>{t.subtitle}</p>
      </div>
      <TransactionTab />
    </div>
  );
}
