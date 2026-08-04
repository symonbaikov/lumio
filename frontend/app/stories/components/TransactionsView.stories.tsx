import type { Meta, StoryObj } from '@storybook/react';
import TransactionsView from '../../components/TransactionsView';
import type { Transaction } from '../../components/TransactionsView';

const mockTransactions: Transaction[] = [
  {
    id: '1',
    transactionDate: '2024-01-15',
    documentNumber: 'DOC-001',
    counterpartyName: 'Test Company 1',
    counterpartyBin: '123456789012',
    paymentPurpose: 'Payment for services',
    debit: 10000,
    credit: 0,
    amount: 10000,
    transactionType: 'EXPENSE',
    currency: 'USD',
    category: { name: 'Services' },
  },
  {
    id: '2',
    transactionDate: '2024-01-16',
    documentNumber: 'DOC-002',
    counterpartyName: 'Test Company 2',
    counterpartyBin: '987654321098',
    paymentPurpose: 'Income from sales',
    debit: 0,
    credit: 15000,
    amount: 15000,
    transactionType: 'INCOME',
    currency: 'USD',
    category: { name: 'Sales' },
  },
  {
    id: '3',
    transactionDate: '2024-01-17',
    documentNumber: 'DOC-003',
    counterpartyName: 'Transfer Recipient',
    paymentPurpose: 'Transfer between accounts',
    debit: 0,
    credit: 5000,
    amount: 5000,
    transactionType: 'TRANSFER',
    currency: 'USD',
  },
  {
    id: '4',
    transactionDate: '2024-01-18',
    documentNumber: 'DOC-004',
    counterpartyName: 'Foreign Partner',
    counterpartyBin: '456789012345',
    paymentPurpose: 'International payment',
    debit: 2000,
    credit: 0,
    amount: 2000,
    transactionType: 'EXPENSE',
    currency: 'USD',
    exchangeRate: 460.5,
    amountForeign: 4.34,
    category: { name: 'International' },
  },
];

const meta: Meta<typeof TransactionsView> = {
  title: 'Components/TransactionsView',
  component: TransactionsView,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    // Fallback currency for rows that carry no currency of their own.
    currency: 'USD',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    transactions: mockTransactions,
  },
};

export const Empty: Story = {
  args: {
    transactions: [],
  },
};

export const ManyTransactions: Story = {
  args: {
    transactions: Array.from({ length: 50 }, (_, i) => ({
      id: `tx-${i + 1}`,
      transactionDate: `2024-01-${String(i + 1).padStart(2, '0')}`,
      documentNumber: `DOC-${String(i + 1).padStart(3, '0')}`,
      counterpartyName: `Company ${i + 1}`,
      counterpartyBin: `${String((i + 1) * 123456789).slice(0, 12)}`,
      paymentPurpose: `Transaction ${i + 1} purpose`,
      debit: i % 2 === 0 ? (i + 1) * 1000 : 0,
      credit: i % 2 === 1 ? (i + 1) * 1500 : 0,
      amount: (i + 1) * 1000,
      transactionType: i % 2 === 0 ? 'EXPENSE' : i % 3 === 0 ? 'INCOME' : 'TRANSFER',
      currency: 'USD',
      category:
        i % 3 === 0 ? { name: 'Category A' } : i % 3 === 1 ? { name: 'Category B' } : undefined,
    })),
  },
};
