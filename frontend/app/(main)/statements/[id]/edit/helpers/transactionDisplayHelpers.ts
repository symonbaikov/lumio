import { getCategoryDisplayName } from '@/app/lib/statement-categories';
import { formatStoredDate } from '@/app/lib/user-format-store';
import type { Transaction } from '../editHelpers';
import { isIdEmpty, resolveLocale } from '../editHelpers';

export function computeMissingCategory(edited: Partial<Transaction>, tx: Transaction): boolean {
  return isIdEmpty(edited.categoryId) && isIdEmpty(tx.categoryId) && isIdEmpty(tx.category?.id);
}

export function getEditedTransaction(
  editedData: Record<string, Partial<Transaction>>,
  tx: Transaction,
): Partial<Transaction> {
  return editedData[tx.id] ?? tx;
}

export function isMultilineField(field: keyof Transaction): boolean {
  return field === 'paymentPurpose' || field === 'comments';
}

export function getEditValue(
  edited: Partial<Transaction>,
  tx: Transaction,
  field: keyof Transaction,
): string {
  const v = edited[field] ?? tx[field];
  return v != null ? String(v) : '';
}

function getCategoryDisplay(tx: Transaction, locale: string): string {
  if (!tx.category?.name) {
    return '—';
  }
  return getCategoryDisplayName(
    { name: tx.category.name, source: tx.category.source, isSystem: tx.category.isSystem },
    locale,
  );
}

type FieldDisplayFn = (
  tx: Transaction,
  locale: string,
  fmt: (n?: number | null) => string,
) => string;
const fieldDisplayMap: Partial<Record<keyof Transaction, FieldDisplayFn>> = {
  transactionDate: (tx, locale) => formatStoredDate(tx.transactionDate, resolveLocale(locale)),
  debit: (tx, _, fmt) => (tx.debit ? fmt(tx.debit) : '—'),
  credit: (tx, _, fmt) => (tx.credit ? fmt(tx.credit) : '—'),
  categoryId: getCategoryDisplay,
  branchId: tx => tx.branch?.name ?? '—',
  walletId: tx => tx.wallet?.name ?? '—',
};

type DisplayParams = {
  tx: Transaction;
  field: keyof Transaction;
  locale: string;
  fmt: (n?: number | null) => string;
};
export function getFieldDisplay({ tx, field, locale, fmt }: DisplayParams): string {
  const fn = fieldDisplayMap[field];
  if (fn) {
    return fn(tx, locale, fmt);
  }
  return String(tx[field] ?? '—');
}

type ChipSx = {
  bgcolor: string;
  color: string;
  border: string;
  borderColor: string;
  fontWeight: number;
  fontSize: string;
};
export function getCategoryChipSx(isDisabled: boolean): ChipSx {
  return {
    bgcolor: isDisabled ? 'error.50' : 'primary.50',
    color: isDisabled ? 'error.700' : 'primary.700',
    border: isDisabled ? '1px solid' : 'none',
    borderColor: isDisabled ? 'error.200' : 'transparent',
    fontWeight: 500,
    fontSize: '0.8125rem',
  };
}

function colVal(
  columns: Record<string, { value?: string }>,
  key: string,
  fallback: string,
): string {
  return columns[key]?.value ?? fallback;
}

export type ColumnLabels = {
  date: string;
  counterparty: string;
  paymentPurpose: string;
  expense: string;
  income: string;
  category: string;
  actions: string;
};
export function getColumnLabels(columns: Record<string, { value?: string }>): ColumnLabels {
  return {
    date: colVal(columns, 'date', 'Date'),
    counterparty: colVal(columns, 'counterparty', 'Counterparty'),
    paymentPurpose: colVal(columns, 'paymentPurposeShort', 'Payment purpose'),
    expense: colVal(columns, 'expense', 'Expense'),
    income: colVal(columns, 'income', 'Income'),
    category: colVal(columns, 'category', 'Category'),
    actions: colVal(columns, 'actions', 'Actions'),
  };
}

function labelVal(
  labels: Record<string, { value?: string } | undefined>,
  key: string,
  fallback: string,
): string {
  return labels[key]?.value ?? fallback;
}

export type EditTableLabels = {
  confirmDelete: string;
  notSelected: string;
  noCategory: string;
  assignCategory: string;
};
export function getEditTableLabels(
  labels: Record<string, { value?: string } | undefined>,
): EditTableLabels {
  return {
    confirmDelete: labelVal(labels, 'confirmDeleteOne', 'Delete transaction?'),
    notSelected: labelVal(labels, 'notSelected', 'Not selected'),
    noCategory: labelVal(labels, 'noCategoryOption', 'No category'),
    assignCategory: labelVal(labels, 'assignCategory', 'Assign category'),
  };
}

type RowSx = {
  bgcolor: string | undefined;
  borderLeft: string | undefined;
  borderLeftColor: string | undefined;
  transition: string;
  '&:hover': { bgcolor: string };
};
export function getRowSx(missing: boolean): RowSx {
  return {
    bgcolor: missing ? 'error.50' : undefined,
    borderLeft: missing ? '3px solid' : undefined,
    borderLeftColor: missing ? 'error.400' : undefined,
    transition: 'all 0.15s',
    '&:hover': { bgcolor: missing ? 'error.100' : 'grey.50' },
  };
}
