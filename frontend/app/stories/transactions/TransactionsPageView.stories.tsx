import type { Meta, StoryObj } from '@storybook/react';
import TransactionsPageView from '../../components/transactions/TransactionsPageView';
import type { Category, StatementDetails, Transaction } from '../../components/transactions/types';

const mockTransactions: Transaction[] = [
  {
    id: '1',
    transactionDate: '2024-01-15',
    documentNumber: 'DOC-001',
    counterpartyName: 'Test Company 1',
    counterpartyBin: '123456789012',
    debit: 10000,
    credit: 0,
    amount: 10000,
    paymentPurpose: 'Payment for services',
    currency: 'USD',
    transactionType: 'expense',
    category: { id: 'cat1', name: 'Services' },
  },
  {
    id: '2',
    transactionDate: '2024-01-16',
    documentNumber: 'DOC-002',
    counterpartyName: 'Test Company 2',
    counterpartyBin: '987654321098',
    debit: 0,
    credit: 15000,
    amount: 15000,
    paymentPurpose: 'Income from sales',
    currency: 'USD',
    transactionType: 'income',
    category: { id: 'cat2', name: 'Sales' },
  },
];

const mockCategories: Category[] = [
  { id: 'cat1', name: 'Services', color: '#3b82f6', type: 'expense' },
  { id: 'cat2', name: 'Sales', color: '#10b981', type: 'income' },
  { id: 'cat3', name: 'Office Supplies', color: '#f59e0b', type: 'expense' },
];

const mockStatement: StatementDetails = {
  id: 'stmt-1',
  fileName: 'statement.pdf',
  bankName: 'Test Bank',
  status: 'completed',
  fileSize: 1024 * 1024,
  createdAt: '2024-01-21T10:00:00Z',
  metadata: {
    period: '2024-01-01 — 2024-01-31',
    accountNumber: '...1234',
  },
};

const meta: Meta<typeof TransactionsPageView> = {
  title: 'Transactions/TransactionsPageView',
  component: TransactionsPageView,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    statement: mockStatement,
    transactions: mockTransactions,
    categories: mockCategories,
  },
};

export const WithUncategorizedTransactions: Story = {
  args: {
    statement: mockStatement,
    transactions: [
      ...mockTransactions,
      {
        id: '3',
        transactionDate: '2024-01-17',
        documentNumber: 'DOC-003',
        counterpartyName: 'Uncategorized Company',
        counterpartyBin: '555555555555',
        debit: 5000,
        credit: 0,
        amount: 5000,
        paymentPurpose: 'Uncategorized payment',
        currency: 'USD',
        transactionType: 'expense',
        category: undefined,
      },
    ],
    categories: mockCategories,
  },
};

export const EmptyTransactions: Story = {
  args: {
    statement: mockStatement,
    transactions: [],
    categories: mockCategories,
  },
};
