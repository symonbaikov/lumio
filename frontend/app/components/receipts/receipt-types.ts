export interface EditableReceiptLineItem {
  id: string;
  description: string;
  amount: number;
}

import type { StatementCategorySource } from '@/app/lib/statement-categories';

export interface ReceiptCategoryOption {
  id: string;
  name: string;
  isEnabled?: boolean;
  /** System/translated categories are localized for display (see statement-categories). */
  source?: StatementCategorySource;
  isSystem?: boolean;
}

export interface EditableReceiptParsedData {
  vendor: string;
  amount: number | '';
  currency: string;
  date: string;
  tax: number | '';
  paymentMethod: string;
  transactionType: 'income' | 'expense' | 'transfer' | 'unknown';
  categoryId: string;
  lineItems: EditableReceiptLineItem[];
}
