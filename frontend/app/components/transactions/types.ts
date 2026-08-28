/**
 * TypeScript types for transaction view components
 */
import type { StatementCategorySource } from '@/app/lib/statement-categories';

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
  category?: {
    id: string;
    name: string;
    color?: string;
    isEnabled?: boolean;
    source?: StatementCategorySource;
    isSystem?: boolean;
  };
  branch?: { name: string };
  wallet?: { name: string };
  // Currency conversion (populated when convert_to query param is passed to the API)
  convertedAmount?: number;
  conversionRate?: number;
  convertedCurrency?: string;
  // Split transactions
  splitGroupId?: string | null;
  splitIndex?: number | null;
  // Parsing metadata (optional, might not exist yet)
  parsingConfidence?: number;
  rawExtract?: string;
  hasWarnings?: boolean;
  hasErrors?: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
  isEnabled?: boolean;
  source?: StatementCategorySource;
  isSystem?: boolean;
}

export interface FilterState {
  search: string;
  status: 'all' | 'warnings' | 'errors' | 'uncategorized';
  category: string | null;
}

export interface SortState {
  by: 'date' | 'amount';
  order: 'asc' | 'desc';
}

// Shared function type aliases — defined here (not in .tsx) so max-params linting
// applies the .ts limit (3) rather than the strict .tsx component limit (1).
export type UpdateCategoryFn = (txId: string, categoryId: string) => Promise<void>;
export type FormatAmountFn = (amount: number, currency: string) => string;
export type ResolveDisplayAmountFn = (tx: Transaction, raw: number) => number;

export interface TransactionRowHandlers {
  onRowClick: (tx: Transaction) => void;
  onToggleExpansion: (id: string) => (e: React.SyntheticEvent) => void;
  onSelectRow: (id: string) => (checked: boolean) => void;
  onUpdateCategory?: UpdateCategoryFn;
}

export interface TransactionRowFormatters {
  formatDate: (d: string) => string;
  formatAmount: FormatAmountFn;
  resolveDisplayAmount: ResolveDisplayAmountFn;
  resolveDisplayCurrency: (tx: Transaction) => string;
}

export interface StatementDetails {
  id: string;
  fileName: string;
  bankName: string;
  status: string;
  fileSize: number;
  createdAt: string;
  metadata?: {
    accountNumber?: string;
    period?: string;
  };
  category?: { name: string; color?: string; isEnabled?: boolean } | null;
  categoryId?: string | null;
}
