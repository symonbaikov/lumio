/**
 * TypeScript types for transaction view components
 */

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
  category?: { id: string; name: string; color?: string; isEnabled?: boolean };
  branch?: { name: string };
  wallet?: { name: string };
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
