'use client';

import { AppPagination } from '@/app/components/ui/pagination';
import { Search as SearchIcon } from '@mui/icons-material';
import {
  Box,
  Chip,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import { useIntlayer, useLocale } from 'next-intlayer';
import React, { useMemo, useState } from 'react';

export interface Transaction {
  id: string;
  transactionDate: string;
  documentNumber?: string;
  counterpartyName: string;
  counterpartyBin?: string;
  paymentPurpose: string;
  debit: number;
  credit: number;
  amount: number;
  transactionType: string;
  currency?: string;
  exchangeRate?: number;
  article?: string;
  amountForeign?: number;
  category?: { name: string; isEnabled?: boolean };
  branch?: { name: string };
  wallet?: { name: string };
}

interface TransactionsViewProps {
  transactions: Transaction[];
}

type ColumnDef = {
  key: string;
  label: string;
  render?: (tx: Transaction) => React.ReactNode;
};

/**
 * Component for displaying transactions list with search and pagination
 */
export default function TransactionsView({ transactions }: TransactionsViewProps) {
  const t = useIntlayer('transactionsView');
  const { locale } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US');
  };

  const formatAmount = (amount: number, currency?: string): string => {
    return new Intl.NumberFormat(locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US', {
      style: 'currency',
      currency: currency || 'KZT',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, 'success' | 'error' | 'info'> = {
      INCOME: 'success',
      EXPENSE: 'error',
      TRANSFER: 'info',
    };
    return colors[type] || 'default';
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INCOME':
        return t.type.income;
      case 'EXPENSE':
        return t.type.expense;
      case 'TRANSFER':
        return t.type.transfer;
      default:
        return type;
    }
  };

  const filteredTransactions = transactions.filter(
    tx =>
      tx.counterpartyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.paymentPurpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.documentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.counterpartyBin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.article?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const paginatedTransactions = filteredTransactions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / rowsPerPage));

  const availableColumns: ColumnDef[] = useMemo(() => {
    const presentKeys = new Set<string>();
    transactions.forEach(tx => {
      Object.keys(tx).forEach(key => {
        if (key === 'id') return;
        presentKeys.add(key);
      });
    });

    const preferredOrder: Array<keyof Transaction> = [
      'transactionDate',
      'documentNumber',
      'counterpartyName',
      'counterpartyBin',
      'paymentPurpose',
      'debit',
      'credit',
      'currency',
      'exchangeRate',
      'transactionType',
      'category',
      'article',
      'amountForeign',
      'branch',
      'wallet',
    ];

    const labelMap: Record<string, string> = {
      transactionDate: t.columns.transactionDate.value,
      documentNumber: t.columns.documentNumber.value,
      counterpartyName: t.columns.counterpartyName.value,
      counterpartyBin: t.columns.counterpartyBin.value,
      paymentPurpose: t.columns.paymentPurpose.value,
      debit: t.columns.debit.value,
      credit: t.columns.credit.value,
      currency: t.columns.currency.value,
      exchangeRate: t.columns.exchangeRate.value,
      transactionType: t.columns.transactionType.value,
      category: t.columns.category.value,
      article: t.columns.article.value,
      amountForeign: t.columns.amountForeign.value,
      branch: t.columns.branch.value,
      wallet: t.columns.wallet.value,
    };

    const renderers: Record<string, (tx: Transaction) => React.ReactNode> = {
      transactionDate: tx => formatDate(tx.transactionDate),
      debit: tx => (tx.debit > 0 ? formatAmount(tx.debit, tx.currency) : t.dash),
      credit: tx => (tx.credit > 0 ? formatAmount(tx.credit, tx.currency) : t.dash),
      currency: tx => tx.currency || 'KZT',
      exchangeRate: tx =>
        tx.exchangeRate
          ? tx.exchangeRate.toLocaleString(
              locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
              { minimumFractionDigits: 2 },
            )
          : t.dash,
      transactionType: tx => (
        <Chip
          label={getTypeLabel(tx.transactionType)}
          size="small"
          color={getTypeColor(tx.transactionType)}
        />
      ),
      category: tx =>
        tx.category?.name ? (
          <Chip
            label={
              tx.category.isEnabled === false
                ? `${tx.category.name} — select category`
                : tx.category.name
            }
            size="small"
            variant="outlined"
            color={tx.category.isEnabled === false ? 'error' : 'default'}
          />
        ) : (
          t.dash
        ),
      branch: tx => tx.branch?.name || t.dash.value,
      wallet: tx => tx.wallet?.name || t.dash.value,
      paymentPurpose: tx => tx.paymentPurpose || t.dash.value,
      counterpartyName: tx => tx.counterpartyName || t.dash.value,
      counterpartyBin: tx => tx.counterpartyBin || t.dash.value,
      documentNumber: tx => tx.documentNumber || t.dash.value,
      amountForeign: tx =>
        tx.amountForeign
          ? tx.amountForeign.toLocaleString(
              locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
              { minimumFractionDigits: 2 },
            )
          : t.dash,
    };

    const columns: ColumnDef[] = [];

    preferredOrder.forEach(key => {
      if (presentKeys.has(key)) {
        columns.push({
          key,
          label: labelMap[key] || key,
          render: renderers[key],
        });
        presentKeys.delete(key);
      }
    });

    // Any other keys from backend that we don't know about yet
    Array.from(presentKeys).forEach(key => {
      columns.push({
        key,
        label: labelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
        render: (tx: Transaction) => {
          const value = (tx as any)[key];
          if (value === null || value === undefined || value === '') {
            return t.dash;
          }
          if (typeof value === 'number') {
            return value.toLocaleString(
              locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
            );
          }
          if (typeof value === 'object') {
            return value.name || JSON.stringify(value);
          }
          return value.toString();
        },
      });
    });

    return columns;
  }, [transactions, locale, t]);

  return (
    <Box>
      {/* Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder={t.searchPlaceholder.value}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Transactions table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {availableColumns.map(col => (
                <TableCell key={col.key}>{col.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={availableColumns.length || 1} align="center">
                  {t.empty}
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransactions.map(tx => (
                <TableRow key={tx.id} hover>
                  {availableColumns.map(col => (
                    <TableCell key={col.key}>
                      {col.render ? col.render(tx) : ((tx as any)[col.key] ?? '—').toString()}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">{t.pagination.rowsPerPage.value}:</span>
            <select
              value={rowsPerPage}
              onChange={e => {
                setRowsPerPage(Number.parseInt(e.target.value, 10));
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

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">
              {filteredTransactions.length === 0
                ? `0-0 ${t.pagination.of.value} 0`
                : `${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, filteredTransactions.length)} ${t.pagination.of.value} ${filteredTransactions.length}`}
            </span>
            <AppPagination
              page={page + 1}
              total={totalPages}
              onChange={nextPage => setPage(nextPage - 1)}
            />
          </div>
        </div>
      </TableContainer>
    </Box>
  );
}
