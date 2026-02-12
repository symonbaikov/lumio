import type { TransactionType } from '../../../entities/transaction.entity';

export interface TopCategoriesReport {
  period: {
    from: string;
    to: string;
  };
  totals: {
    income: number;
    expense: number;
    net: number;
    transactions: number;
  };
  categories: Array<{
    id: string | null;
    name: string;
    amount: number;
    percentage: number;
    transactions: number;
    type: TransactionType;
    color?: string | null;
    icon?: string | null;
  }>;
  banks: Array<{
    bankName: string;
    amount: number;
    percentage: number;
    statements: number;
  }>;
  counterparties: Array<{
    name: string;
    amount: number;
    percentage: number;
    transactions: number;
    type: TransactionType;
  }>;
}
