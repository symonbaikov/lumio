'use client';

import { EmptyStateIllustration } from '@/app/components/ui/EmptyStateIllustration';
import { Checkbox } from '../ui/checkbox';
import { TransactionMobileCard } from './TransactionMobileCard';
import type { TransactionRowFormatters, TransactionRowHandlers } from './TransactionRow';
import type { Category, SortState, Transaction } from './types';

interface TransactionMobileListProps {
  transactions: Transaction[];
  allTransactionsCount: number;
  categories: Category[];
  selectedIds: string[];
  expandedIds: Set<string>;
  sort: SortState;
  allSelected: boolean;
  someSelected: boolean;
  handlers: TransactionRowHandlers;
  formatters: TransactionRowFormatters;
  onSelectAll: (checked: boolean) => void;
  onToggleSort: (by: SortState['by']) => void;
  noResultsLabel: string;
  uncategorizedLabel: string;
  columnBinLabel: string;
  columnDateLabel: string;
  columnDateSortLabel: string;
}

export function TransactionMobileList({
  transactions,
  allTransactionsCount,
  categories,
  selectedIds,
  expandedIds,
  allSelected,
  someSelected,
  handlers,
  formatters,
  onSelectAll,
  onToggleSort,
  noResultsLabel,
  uncategorizedLabel,
  columnBinLabel,
  columnDateLabel,
  columnDateSortLabel,
}: TransactionMobileListProps): React.ReactElement {
  return (
    <div className="lumio-tx-mobile">
      <div className="lumio-tx-mobile__header">
        <div className="lumio-tx-mobile__header-left">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onCheckedChange={onSelectAll}
            style={{ height: 20, width: 20 }}
            aria-label="Select all rows"
          />
          <span style={{ fontSize: 14, color: 'var(--foreground)' }}>
            {selectedIds.length}/{allTransactionsCount}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onToggleSort('date')}
          className="lumio-tx-mobile__header-sort"
        >
          {columnDateSortLabel}
        </button>
      </div>
      <div className="lumio-tx-mobile__list">
        {transactions.length === 0 ? (
          <div className="lumio-tx-mobile__empty">
            <EmptyStateIllustration name="transactions" size="md" />
            {noResultsLabel}
          </div>
        ) : (
          transactions.map(tx => (
            <TransactionMobileCard
              key={tx.id}
              tx={tx}
              isExpanded={expandedIds.has(tx.id)}
              isSelected={selectedIds.includes(tx.id)}
              categories={categories}
              handlers={handlers}
              formatters={formatters}
              uncategorizedLabel={uncategorizedLabel}
              columnBinLabel={columnBinLabel}
              columnDateLabel={columnDateLabel}
            />
          ))
        )}
      </div>
    </div>
  );
}
