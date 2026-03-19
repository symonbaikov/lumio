'use client';

import { useIntlayer } from '@/app/i18n';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import DetailsDrawer from './DetailsDrawer';
import ExportModal from './ExportModal';
import SummaryBar from './SummaryBar';
import TransactionsTable from './TransactionsTable';
import type { Category, FilterState, StatementDetails, Transaction } from './types';

interface TransactionsPageViewProps {
  statement: StatementDetails;
  transactions: Transaction[];
  categories: Category[];
  onUpdateCategory?: (txIds: string[], categoryId: string) => Promise<void>;
  onDownload?: () => void;
  onReload?: () => Promise<void>;
}

/**
 * Main component for transaction view page with summary, table, and drawer
 */
export default function TransactionsPageView({
  statement,
  transactions,
  categories,
  onUpdateCategory,
  onDownload,
  onReload,
}: TransactionsPageViewProps) {
  const t = useIntlayer('transactionsPageView');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailsTransaction, setDetailsTransaction] = useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    category: null,
  });

  const handleRowClick = (transaction: Transaction) => {
    setDetailsTransaction(transaction);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setDetailsTransaction(null), 300);
  };

  const handleSingleUpdateCategory = async (txId: string, categoryId: string) => {
    if (!onUpdateCategory) {
      toast.error(t.notImplemented?.value || 'Not implemented yet');
      return;
    }

    try {
      await onUpdateCategory([txId], categoryId);
      toast.success(t.categoryUpdated?.value || 'Category updated successfully');
      handleCloseDrawer();
    } catch (error) {
      console.error('Failed to update category:', error);
      toast.error(t.categoryUpdateFailed?.value || 'Failed to update category');
    }
  };

  const handleBulkAssignCategory = async () => {
    if (!bulkCategoryId || selectedIds.length === 0 || !onUpdateCategory) return;

    try {
      await onUpdateCategory(selectedIds, bulkCategoryId);
      toast.success(
        t.categoriesUpdated?.value || `Category assigned to ${selectedIds.length} transaction(s)`,
      );
      setSelectedIds([]);
      setBulkCategoryId('');
    } catch (error) {
      console.error('Failed to bulk update categories:', error);
      toast.error(t.bulkUpdateFailed?.value || 'Failed to update categories');
    }
  };

  const handleExport = () => {
    setExportModalOpen(true);
  };

  const handleFixIssues = async () => {
    // Get all uncategorized transactions
    const uncategorizedTxIds = transactions.filter(tx => !tx.category).map(tx => tx.id);

    if (uncategorizedTxIds.length === 0) {
      toast.success(t.allCategorized.value);
      return;
    }

    try {
      setFixing(true);
      const toastId = toast.loading(
        t.categorizingProgress.value.replace('{{count}}', String(uncategorizedTxIds.length)),
      );

      // Call classification API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/classification/bulk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({ transactionIds: uncategorizedTxIds }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to auto-categorize transactions');
      }

      const results = await response.json();

      // Reload data to show updated categories
      if (onReload) {
        await onReload();
      }

      // Show detailed results based on outcome
      if (results.successful > 0 && results.failed === 0 && results.notFound === 0) {
        // All successful
        toast.success(t.categorizeSuccess.value.replace('{{count}}', String(results.successful)), {
          id: toastId,
        });
      } else if (results.successful > 0 && (results.failed > 0 || results.notFound > 0)) {
        // Partial success
        toast(
          t.categorizePartial.value
            .replace('{{successful}}', String(results.successful))
            .replace('{{total}}', String(results.total))
            .replace('{{failed}}', String(results.failed + results.notFound)),
          { id: toastId, duration: 6000, icon: '⚠️' },
        );
        console.error('Categorization errors:', results.errors);
      } else {
        // All failed
        toast.error(
          t.categorizeFailed.value.replace('{{count}}', String(results.failed + results.notFound)),
          {
            id: toastId,
          },
        );
        console.error('All errors:', results.errors);
      }
    } catch (error) {
      console.error('Failed to fix issues:', error);
      toast.error(t.autoFixFailed.value);
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <SummaryBar
        statement={statement}
        transactions={transactions}
        onExport={handleExport}
        onFixIssues={handleFixIssues}
        onDownload={onDownload}
        fixing={fixing}
      />

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-none border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {selectedIds.length}
            </span>
            <span className="text-sm font-semibold text-gray-700">{t.selected.value}</span>
          </div>

          <div className="flex flex-1 items-center gap-2">
            <select
              value={bulkCategoryId}
              onChange={e => setBulkCategoryId(e.target.value)}
              className="flex-1 max-w-xs rounded-none border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">{t.selectCategory.value}</option>
              {categories
                .filter(cat => cat.isEnabled !== false)
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>

            <button
              type="button"
              onClick={handleBulkAssignCategory}
              disabled={!bulkCategoryId}
              className="rounded-none bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.apply.value}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="rounded-none border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {t.clearSelection.value}
          </button>
        </div>
      )}

      {/* Transactions Table */}
      <TransactionsTable
        transactions={transactions}
        categories={categories}
        selectedIds={selectedIds}
        onSelectRows={setSelectedIds}
        onRowClick={handleRowClick}
        onUpdateCategory={handleSingleUpdateCategory}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* Details Drawer */}
      <DetailsDrawer
        open={drawerOpen}
        transaction={detailsTransaction}
        categories={categories}
        onClose={handleCloseDrawer}
        onUpdateCategory={handleSingleUpdateCategory}
      />

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={type => {
          if (type === 'table') {
            toast.success(t.exportToTable.value);
          } else {
            toast.success(t.exportFormat.value.replace('{{type}}', type));
          }
        }}
      />
    </div>
  );
}
