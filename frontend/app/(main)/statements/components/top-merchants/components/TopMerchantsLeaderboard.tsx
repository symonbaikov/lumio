'use client';

import { AnalyticsSourceBadge } from '@/app/(main)/statements/components/analytics/AnalyticsSourceBadge';
import type {
  AggregateSortKey,
  TopMerchantAggregateRow,
  TopMerchantSourceChannel,
} from '@/app/(main)/statements/components/top-merchants/top-merchants.types';
import { EmptyStateIllustration } from '@/app/components/ui/EmptyStateIllustration';
import { formatMoney } from '@/app/lib/analytics-common';
import { tokens } from '@/lib/theme-tokens';

type SourceLabels = { sourceBank: string; sourceReceipt: string; sourceGmailInbox: string };
type SortLabels = { sortByAmount: string; sortByAverage: string; sortByOperations: string };
type ColumnLabels = {
  merchant: string;
  source: string;
  operations: string;
  average: string;
  amount: string;
  lastOperation: string;
};

type Props = {
  rows: TopMerchantAggregateRow[];
  sortKey: AggregateSortKey;
  onSortChange: (key: AggregateSortKey) => void;
  onRowClick: (id: string) => void;
  title: string;
  currency: string;
  sourceLabels: SourceLabels;
  sortLabels: SortLabels;
  columnLabels: ColumnLabels;
  emptyLabel: string;
};

const SORT_KEYS: AggregateSortKey[] = ['amount', 'average', 'operations'];

type SortBtnProps = { label: string; active: boolean; onClick: () => void };

function SortBtn({ label, active, onClick }: SortBtnProps): React.JSX.Element {
  return (
    <button
      type="button"
      style={{
        borderRadius: tokens.radius.sm,
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 500,
        background: active ? 'var(--card-bg)' : 'transparent',
        color: active ? 'var(--foreground)' : 'var(--text-secondary)',
        border: 'none',
        cursor: 'pointer',
        boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

type RowProps = {
  row: TopMerchantAggregateRow;
  sourceLabels: SourceLabels;
  onRowClick: (id: string) => void;
};

function LeaderboardRow({ row, sourceLabels, onRowClick }: RowProps): React.JSX.Element {
  const lastDate =
    row.lastDate && !Number.isNaN(new Date(row.lastDate).getTime())
      ? new Date(row.lastDate).toLocaleDateString()
      : '-';
  return (
    <tr style={{ color: 'var(--foreground)', borderTop: '1px solid var(--muted)' }}>
      <td style={{ padding: '8px 16px 8px 0', fontWeight: 500, color: 'var(--foreground)' }}>
        <button
          type="button"
          style={{
            textAlign: 'left',
            color: 'var(--primary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontSize: 14,
          }}
          onClick={() => onRowClick(row.id)}
        >
          {row.merchant}
        </button>
      </td>
      <td style={{ padding: '8px 16px 8px 0' }}>
        <AnalyticsSourceBadge
          sourceChannel={row.sourceChannel as TopMerchantSourceChannel}
          labels={sourceLabels}
        />
      </td>
      <td style={{ padding: '8px 16px 8px 0', textAlign: 'right' }}>{row.count}</td>
      <td style={{ padding: '8px 16px 8px 0', textAlign: 'right' }}>
        {formatMoney(row.average, row.currency)}
      </td>
      <td
        style={{
          padding: '8px 16px 8px 0',
          textAlign: 'right',
          fontWeight: 600,
          color: 'var(--foreground)',
        }}
      >
        {formatMoney(row.total, row.currency)}
      </td>
      <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--muted-foreground)' }}>
        {lastDate}
      </td>
    </tr>
  );
}

export function TopMerchantsLeaderboard({
  rows,
  sortKey,
  onSortChange,
  onRowClick,
  title,
  sourceLabels,
  sortLabels,
  columnLabels,
  emptyLabel,
}: Props): React.JSX.Element {
  const sortKeyLabels: Record<AggregateSortKey, string> = {
    amount: sortLabels.sortByAmount,
    average: sortLabels.sortByAverage,
    operations: sortLabels.sortByOperations,
  };
  return (
    <div
      style={{
        border: '1px solid var(--border-color)',
        background: 'var(--card-bg)',
        padding: 20,
        borderRadius: tokens.radius.lg,
      }}
    >
      <div
        style={{
          marginBottom: 8,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{title}</h3>
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{rows.length}</span>
        </div>
        <div
          style={{
            display: 'inline-flex',
            border: '1px solid var(--border-color)',
            background: 'var(--muted)',
            padding: 4,
            borderRadius: tokens.radius.md,
          }}
        >
          {SORT_KEYS.map(k => (
            <SortBtn
              key={k}
              label={sortKeyLabels[k]}
              active={sortKey === k}
              onClick={() => onSortChange(k)}
            />
          ))}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                textAlign: 'left',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--muted-foreground)',
              }}
            >
              <th style={{ padding: '8px 16px 8px 0' }}>{columnLabels.merchant}</th>
              <th style={{ padding: '8px 16px 8px 0' }}>{columnLabels.source}</th>
              <th style={{ padding: '8px 16px 8px 0', textAlign: 'right' }}>
                {columnLabels.operations}
              </th>
              <th style={{ padding: '8px 16px 8px 0', textAlign: 'right' }}>
                {columnLabels.average}
              </th>
              <th style={{ padding: '8px 16px 8px 0', textAlign: 'right' }}>
                {columnLabels.amount}
              </th>
              <th style={{ padding: '8px 0', textAlign: 'right' }}>{columnLabels.lastOperation}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px 0', textAlign: 'center' }}>
                  <EmptyStateIllustration name="top-merchants" size="md" />
                  <span style={{ color: 'var(--muted-foreground)' }}>{emptyLabel}</span>
                </td>
              </tr>
            ) : null}
            {rows.slice(0, 60).map(row => (
              <LeaderboardRow
                key={row.id}
                row={row}
                sourceLabels={sourceLabels}
                onRowClick={onRowClick}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
