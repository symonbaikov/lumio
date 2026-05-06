'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useIntlayer } from '@/app/i18n';
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import DetailsDrawer from '@/app/components/transactions/DetailsDrawer';
import TransactionsTable from '@/app/components/transactions/TransactionsTable';
import { useTransactionData } from '@/app/components/transactions/hooks/useTransactionData';
import type { FilterState, Transaction } from '@/app/components/transactions/types';
import { CurrencyDisplayToggle } from '@/app/components/ui/CurrencyDisplayToggle';
import { CurrencyFilterDropdown } from '@/app/components/ui/CurrencyFilterDropdown';
import { Spinner } from '@/app/components/ui/spinner';
import { useCurrencyDisplay } from '@/app/contexts/CurrencyDisplayContext';
import api from '@/app/lib/api';
import { tokens } from '@/lib/theme-tokens';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, max-lines-per-function, complexity
export function TransactionTab() {
  const t = useIntlayer('transactionsPageView');
  const { showConverted, workspaceCurrency } = useCurrencyDisplay();

  const [currencyFilter, setCurrencyFilter] = useState<string | null>(null);
  const { transactions, categories, loading, error, refetch } = useTransactionData({
    showConverted,
    workspaceCurrency,
    currencyFilter,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailsTransaction, setDetailsTransaction] = useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    category: null,
  });

  const availableCurrencies = useMemo(
    () => [...new Set(transactions.map(tx => tx.currency).filter(Boolean) as string[])].sort(),
    [transactions],
  );

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const handleRowClick = (transaction: Transaction) => {
    setDetailsTransaction(transaction);
    setDrawerOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setDetailsTransaction(null), 300);
  };

  // eslint-disable-next-line max-params, @typescript-eslint/explicit-function-return-type
  const handleUpdateCategory = async (txIds: string[], categoryId: string) => {
    try {
      await api.patch('/transactions/bulk-update-category', {
        transactionIds: txIds,
        categoryId,
      });
      await refetch();
      toast.success(t.categoriesUpdated?.value || `Category updated successfully`);
    } catch (err) {
      console.error('Failed to update category:', err);
      toast.error(t.bulkUpdateFailed?.value || 'Failed to update category');
      throw err;
    }
  };

  // eslint-disable-next-line max-params, @typescript-eslint/explicit-function-return-type
  const handleSingleUpdateCategory = async (txId: string, categoryId: string) => {
    try {
      await handleUpdateCategory([txId], categoryId);
      handleCloseDrawer();
    } catch {
      // Error handled in handleUpdateCategory
    }
  };

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const handleBulkAssignCategory = async () => {
    if (!bulkCategoryId || selectedIds.length === 0) return;
    try {
      await handleUpdateCategory(selectedIds, bulkCategoryId);
      setSelectedIds([]);
      setBulkCategoryId('');
    } catch {
      // Error handled in handleUpdateCategory
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <Box sx={{ display: 'flex', minHeight: 400, alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
      </Box>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <Box sx={{ border: '1px solid #fecaca', bgcolor: 'var(--color-error-soft-bg)', p: 2, color: 'var(--destructive)', mb: 2 }}>
        {error}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Currency Controls */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
        <CurrencyDisplayToggle />
        <CurrencyFilterDropdown
          currencies={availableCurrencies}
          value={currencyFilter}
          onChange={setCurrencyFilter}
        />
      </Box>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.5,
            border: '1px solid rgba(var(--primary-rgb), 0.3)',
            bgcolor: 'rgba(var(--primary-rgb), 0.05)',
            p: 2,
            transition: 'all 300ms',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                height: 24,
                width: 24,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: tokens.radius.full,
                bgcolor: 'var(--primary)',
                fontSize: 12,
                fontWeight: 700,
                color: 'white',
              }}
            >
              {selectedIds.length}
            </Box>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
              {t.selected?.value || 'selected'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', gap: 1 }}>
            <select
              value={bulkCategoryId}
              onChange={e => setBulkCategoryId(e.target.value)}
              style={{ flex: 1, maxWidth: 320, border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', padding: '8px 12px', fontSize: 14 }}
            >
              <option value="">{t.selectCategory?.value || 'Select category...'}</option>
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
              style={{
                backgroundColor: 'var(--primary)',
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 600,
                color: 'white',
                border: 'none',
                cursor: bulkCategoryId ? 'pointer' : 'not-allowed',
                opacity: bulkCategoryId ? 1 : 0.5,
                transition: 'opacity 150ms',
              }}
            >
              {t.apply?.value || 'Apply'}
            </button>
          </Box>

          <button
            type="button"
            onClick={() => setSelectedIds([])}
            style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', padding: '8px 16px', fontSize: 14, fontWeight: 600, color: 'var(--foreground)', cursor: 'pointer', transition: 'background-color 150ms' }}
          >
            {t.clearSelection?.value || 'Clear selection'}
          </button>
        </Box>
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
    </Box>
  );
}
