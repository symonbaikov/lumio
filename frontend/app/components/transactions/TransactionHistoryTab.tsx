'use client';

import { EntityHistoryTimeline } from '@/app/audit/components/EntityHistoryTimeline';
import { useIntlayer } from '@/app/i18n';
import type { AuditEvent } from '@/lib/api/audit';

interface TransactionHistoryTabProps {
  events: AuditEvent[];
  loading: boolean;
  onSelect: (event: AuditEvent) => void;
}

export function TransactionHistoryTab({ events, loading, onSelect }: TransactionHistoryTabProps) {
  const t = useIntlayer('transactionsDrawer');
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--card-bg)',
            padding: 16,
            fontSize: 14,
            color: 'var(--muted-foreground)',
          }}
        >
          {t.loadingHistory}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <EntityHistoryTimeline events={events} onSelect={onSelect} />
    </div>
  );
}
