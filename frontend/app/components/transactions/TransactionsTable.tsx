'use client';

import {
  ArrowDownUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Search,
  X,
} from 'lucide-react';
import { useIntlayer, useLocale } from 'next-intlayer';
import React, { useMemo, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import type { Category, FilterState, SortState, Transaction } from './types';

interface TransactionsTableProps {
  transactions: Transaction[];
  categories: Category[];
  selectedIds: string[];
  onSelectRows: (ids: string[]) => void;
  onRowClick: (transaction: Transaction) => void;
  onUpdateCategory?: (txId: string, categoryId: string) => Promise<void>;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

/**
 * Enhanced transactions table with filters, sorting, and row selection
 */
export default function TransactionsTable({
  transactions,
  categories,
  selectedIds,
  onSelectRows,
  onRowClick,
  onUpdateCategory,
  filters,
  onFilterChange,
}: TransactionsTableProps) {
  const { locale } = useLocale();
  const t = useIntlayer('transactionsTable');

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpansion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const [sort, setSort] = useState<SortState>({
    by: 'date',
    order: 'desc',
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [showFilters, setShowFilters] = useState(false);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(
      locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' },
    );
  };

  const formatAmount = (amount: number, currency?: string): string => {
    if (Number.isNaN(amount)) return '—';
    return new Intl.NumberFormat(locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US', {
      style: 'currency',
      currency: currency || 'KZT',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const truncateText = (text: string, maxLength = 60) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}…`;
  };

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        tx =>
          tx.counterpartyName?.toLowerCase().includes(searchLower) ||
          tx.paymentPurpose?.toLowerCase().includes(searchLower) ||
          tx.counterpartyBin?.toLowerCase().includes(searchLower) ||
          tx.documentNumber?.toLowerCase().includes(searchLower),
      );
    }

    // Apply status filter
    if (filters.status === 'warnings') {
      result = result.filter(tx => tx.hasWarnings);
    } else if (filters.status === 'errors') {
      result = result.filter(tx => tx.hasErrors);
    } else if (filters.status === 'uncategorized') {
      result = result.filter(tx => !tx.category);
    }

    // Apply category filter
    if (filters.category) {
      result = result.filter(tx => tx.category?.id === filters.category);
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sort.by === 'date') {
        const dateA = new Date(a.transactionDate).getTime();
        const dateB = new Date(b.transactionDate).getTime();
        return sort.order === 'asc' ? dateA - dateB : dateB - dateA;
      }
      if (sort.by === 'amount') {
        const amountA = Math.abs(Number(a.debit) || Number(a.credit) || 0);
        const amountB = Math.abs(Number(b.debit) || Number(b.credit) || 0);
        return sort.order === 'asc' ? amountA - amountB : amountB - amountA;
      }
      return 0;
    });

    return result;
  }, [transactions, filters, sort]);

  const paginatedTransactions = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredAndSortedTransactions.slice(start, start + rowsPerPage);
  }, [filteredAndSortedTransactions, page, rowsPerPage]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectRows(filteredAndSortedTransactions.map(tx => tx.id));
    } else {
      onSelectRows([]);
    }
  };

  const handleSelectRow = (txId: string, checked: boolean) => {
    if (checked) {
      onSelectRows([...selectedIds, txId]);
    } else {
      onSelectRows(selectedIds.filter(id => id !== txId));
    }
  };

  const toggleSort = (by: 'date' | 'amount') => {
    if (sort.by === by) {
      setSort({ by, order: sort.order === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ by, order: 'desc' });
    }
  };

  const clearFilters = () => {
    onFilterChange({ search: '', status: 'all', category: null });
  };

  const hasActiveFilters = filters.search || filters.status !== 'all' || filters.category !== null;

  const allSelected =
    paginatedTransactions.length > 0 &&
    paginatedTransactions.every(tx => selectedIds.includes(tx.id));
  const someSelected = paginatedTransactions.some(tx => selectedIds.includes(tx.id));

  return (
    <div className="space-y-4">
      {/* Toolbar: Search and filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t.searchPlaceholder.value}
            value={filters.search}
            onChange={e => onFilterChange({ ...filters, search: e.target.value })}
            className="w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition ${
            hasActiveFilters
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary'
          }`}
        >
          <Filter className="h-4 w-4" />
          {t.filters.value}
          {hasActiveFilters && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
              {(filters.status !== 'all' ? 1 : 0) + (filters.category ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status filter */}
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="status-filter"
                className="mb-1 block text-xs font-semibold text-gray-700"
              >
                {t.statusFilter.value}
              </label>
              <select
                id="status-filter"
                value={filters.status}
                onChange={e =>
                  onFilterChange({
                    ...filters,
                    status: e.target.value as FilterState['status'],
                  })
                }
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                <option value="all">{t.statusAll.value}</option>
                <option value="warnings">{t.statusWarnings.value}</option>
                <option value="errors">{t.statusErrors.value}</option>
                <option value="uncategorized">{t.statusUncategorized.value}</option>
              </select>
            </div>

            {/* Category filter */}
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="category-filter"
                className="mb-1 block text-xs font-semibold text-gray-700"
              >
                {t.categoryFilter.value}
              </label>
              <select
                id="category-filter"
                value={filters.category || ''}
                onChange={e =>
                  onFilterChange({
                    ...filters,
                    category: e.target.value || null,
                  })
                }
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                <option value="">{t.categoryAll.value}</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-auto rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-primary hover:text-primary"
              >
                {t.clearFilters.value}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
              <tr>
                {/* Expand Chevron */}
                <th className="w-8 px-2 py-3" />

                {/* Checkbox column */}
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={e => handleSelectAll(e.target.checked)}
                    ref={input => {
                      if (input) {
                        input.indeterminate = someSelected && !allSelected;
                      }
                    }}
                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/20"
                  />
                </th>

                {/* Date column (sortable) */}
                <th className="px-4 py-3 text-left">
                  <button
                    type="button"
                    onClick={() => toggleSort('date')}
                    className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
                  >
                    {t.columnDate.value}
                    {sort.by === 'date' ? (
                      sort.order === 'asc' ? (
                        <ArrowUpDown className="h-3 w-3" />
                      ) : (
                        <ArrowDownUp className="h-3 w-3" />
                      )
                    ) : (
                      <ChevronDown className="h-3 w-3 opacity-30" />
                    )}
                  </button>
                </th>

                {/* Counterparty */}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t.columnCounterparty.value}
                </th>

                {/* Purpose */}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t.columnPurpose.value}
                </th>

                {/* Debit (sortable) */}
                <th className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('amount')}
                    className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
                  >
                    {t.columnDebit.value}
                    {sort.by === 'amount' ? (
                      sort.order === 'asc' ? (
                        <ArrowUpDown className="h-3 w-3" />
                      ) : (
                        <ArrowDownUp className="h-3 w-3" />
                      )
                    ) : (
                      <ChevronDown className="h-3 w-3 opacity-30" />
                    )}
                  </button>
                </th>

                {/* Credit */}
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t.columnCredit.value}
                </th>

                {/* Category */}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t.columnCategory.value}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500">
                    {t.noResults.value}
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map(tx => {
                  const isExpanded = expandedIds.has(tx.id);
                  return (
                    <React.Fragment key={tx.id}>
                      <tr
                        onClick={() => onRowClick(tx)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(tx);
                          }
                        }}
                        tabIndex={0}
                        aria-label={`Transaction from ${tx.counterpartyName}`}
                        className={`cursor-pointer transition hover:bg-muted/50 border-l-4 ${
                          selectedIds.includes(tx.id)
                            ? 'bg-primary/5 border-primary'
                            : 'border-transparent'
                        } ${
                          tx.hasErrors ? 'bg-red-50/50' : tx.hasWarnings ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* Toggle Expansion */}
                        <td
                          className="px-2 py-4 text-center"
                          onClick={e => toggleExpansion(tx.id, e)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleExpansion(tx.id, e as any);
                            }
                          }}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                        >
                          <div className="flex items-center justify-center h-full text-gray-400 hover:text-gray-600">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </td>

                        {/* Checkbox */}
                        <td
                          className="px-4 py-4"
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(tx.id)}
                            onChange={e => handleSelectRow(tx.id, e.target.checked)}
                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </td>

                        {/* Date */}
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500 tabular-nums">
                          {formatDate(tx.transactionDate)}
                        </td>

                        {/* Counterparty */}
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                          <div className="max-w-[200px]" title={tx.counterpartyName}>
                            {truncateText(tx.counterpartyName, 30)}
                          </div>
                        </td>

                        {/* Purpose */}
                        <td className="px-4 py-4 text-sm text-gray-500">
                          <div className="line-clamp-2 max-w-[300px]" title={tx.paymentPurpose}>
                            {tx.paymentPurpose || '—'}
                          </div>
                        </td>

                        {/* Debit */}
                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm">
                          {Number(tx.debit) > 0 ? (
                            <span className="font-bold text-gray-900">
                              {formatAmount(Number(tx.debit), tx.currency)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Credit */}
                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm">
                          {Number(tx.credit) > 0 ? (
                            <span className="font-bold text-emerald-600">
                              {formatAmount(Number(tx.credit), tx.currency)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Category */}
                        <td
                          className="px-4 py-4"
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                style={{
                                  backgroundColor: tx.category?.color
                                    ? `${tx.category.color}15`
                                    : '#e5e7eb',
                                  color: tx.category?.color || '#374151',
                                }}
                              >
                                {tx.category?.name || t.statusUncategorized.value}
                                <ChevronDown className="h-3 w-3 opacity-50" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px]">
                              <DropdownMenuLabel>{t.categoryFilter.value}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <div className="max-h-[300px] overflow-y-auto">
                                {categories.map(cat => (
                                  <DropdownMenuItem
                                    key={cat.id}
                                    onClick={() => onUpdateCategory?.(tx.id, cat.id)}
                                    className="gap-2"
                                  >
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: cat.color }}
                                    />
                                    {cat.name}
                                    {tx.category?.id === cat.id && (
                                      <Check className="ml-auto h-3 w-3" />
                                    )}
                                  </DropdownMenuItem>
                                ))}
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>

                      {/* Expanded Row */}
                      {isExpanded && (
                        <tr className="bg-gray-50/40">
                          <td colSpan={2} />
                          <td colSpan={7} className="px-4 py-3">
                            <div className="grid grid-cols-2 gap-4 rounded-lg bg-white p-4 text-xs sm:grid-cols-4 border border-gray-100">
                              <div>
                                <span className="block font-semibold text-gray-500 mb-1">
                                  {t.columnBin.value}
                                </span>
                                <span className="font-mono text-gray-900">
                                  {tx.counterpartyBin || '—'}
                                </span>
                              </div>
                              <div>
                                <span className="block font-semibold text-gray-500 mb-1">
                                  Currency
                                </span>
                                <span className="text-gray-900">{tx.currency}</span>
                              </div>
                              <div>
                                <span className="block font-semibold text-gray-500 mb-1">
                                  Doc Number
                                </span>
                                <span className="text-gray-900">{tx.documentNumber || '—'}</span>
                              </div>
                              {/* Add rate if available */}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredAndSortedTransactions.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">{t.rowsPerPage.value}:</span>
              <select
                value={rowsPerPage}
                onChange={e => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(0);
                }}
                className="rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                {page * rowsPerPage + 1}–
                {Math.min((page + 1) * rowsPerPage, filteredAndSortedTransactions.length)}{' '}
                {t.of.value} {filteredAndSortedTransactions.length}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="rounded-md border border-gray-200 px-3 py-1 text-sm font-semibold text-gray-600 transition hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.previous.value}
                </button>
                <button
                  type="button"
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * rowsPerPage >= filteredAndSortedTransactions.length}
                  className="rounded-md border border-gray-200 px-3 py-1 text-sm font-semibold text-gray-600 transition hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.next.value}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
