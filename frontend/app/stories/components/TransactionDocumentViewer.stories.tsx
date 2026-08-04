import type { Meta, StoryObj } from '@storybook/react';
import TransactionDocumentViewer from '../../components/TransactionDocumentViewer';
import type { Statement, Transaction } from '../../components/TransactionDocumentViewer';

const mockTransactions: Transaction[] = [
  {
    id: '1',
    transactionDate: '2024-01-15',
    documentNumber: 'DOC-001',
    counterpartyName: 'Test Company 1',
    counterpartyBin: '123456789012',
    debit: 10000,
    credit: 0,
    paymentPurpose: 'Payment for services rendered',
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
    paymentPurpose: 'Income from product sales',
    currency: 'USD',
    transactionType: 'income',
    category: { id: 'cat2', name: 'Sales' },
  },
  {
    id: '3',
    transactionDate: '2024-01-17',
    documentNumber: 'DOC-003',
    counterpartyName: 'Office Supplies Ltd',
    counterpartyBin: '555555555555',
    debit: 5000,
    credit: 0,
    paymentPurpose: 'Purchase of office equipment',
    currency: 'USD',
    transactionType: 'expense',
    category: { id: 'cat3', name: 'Office Supplies' },
  },
];

const mockStatement: Statement = {
  id: 'stmt-1',
  fileName: 'bank-statement-jan-2024.pdf',
  status: 'completed',
  totalTransactions: 3,
  statementDateFrom: '2024-01-01',
  statementDateTo: '2024-01-31',
  balanceStart: 100000,
  balanceEnd: 110000,
  parsingDetails: {
    detectedBank: 'Kaspi Bank',
    detectedFormat: 'PDF',
    metadataExtracted: {
      accountNumber: 'KZ123456789012345678',
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
      balanceStart: 100000,
      balanceEnd: 110000,
      headerDisplay: {
        title: 'Банковская выписка',
        subtitle: 'Kaspi Bank',
        periodDisplay: 'Январь 2024',
        accountDisplay: 'KZ1234****5678',
        institutionDisplay: 'Kaspi Bank',
        currencyDisplay: 'USD',
      },
    },
  },
};

const meta: Meta<typeof TransactionDocumentViewer> = {
  title: 'Components/TransactionDocumentViewer',
  component: TransactionDocumentViewer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    // Fallback currency for rows that carry no currency of their own.
    currency: 'USD',
  },
  argTypes: {
    locale: {
      control: 'select',
      options: ['ru', 'en', 'kk'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    statement: mockStatement,
    transactions: mockTransactions,
    locale: 'ru',
  },
};

export const EnglishLocale: Story = {
  args: {
    statement: mockStatement,
    transactions: mockTransactions,
    locale: 'en',
  },
};

export const KazakhLocale: Story = {
  args: {
    statement: mockStatement,
    transactions: mockTransactions,
    locale: 'kk',
  },
};

export const EmptyTransactions: Story = {
  args: {
    statement: {
      ...mockStatement,
      totalTransactions: 0,
      balanceStart: 0,
      balanceEnd: 0,
    },
    transactions: [],
    locale: 'ru',
  },
};

export const SingleTransaction: Story = {
  args: {
    statement: {
      ...mockStatement,
      totalTransactions: 1,
      balanceStart: 50000,
      balanceEnd: 60000,
    },
    transactions: [mockTransactions[0]],
    locale: 'ru',
  },
};
