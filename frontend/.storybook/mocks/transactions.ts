import type { Category, StatementDetails, Transaction } from '@/app/components/transactions/types';

export const mockCategory: Category = {
  id: 'cat-1',
  name: 'Операционные расходы',
  color: '#3b82f6',
};

export const mockCategories: Category[] = [
  mockCategory,
  { id: 'cat-2', name: 'Зарплата', color: '#10b981' },
  { id: 'cat-3', name: 'Налоги', color: '#ef4444' },
  { id: 'cat-4', name: 'Аренда', color: '#f59e0b' },
  { id: 'cat-5', name: 'Коммунальные услуги', color: '#8b5cf6' },
];

export const mockTransaction: Transaction = {
  id: 'tx-1',
  transactionDate: '2024-01-15',
  documentNumber: 'ПП-001234',
  counterpartyName: 'ТОО "Пример Компании"',
  counterpartyBin: '123456789012',
  paymentPurpose: 'Оплата за услуги по договору №123 от 01.01.2024',
  debit: 150000,
  credit: 0,
  currency: 'USD',
  transactionType: 'EXPENSE',
  category: mockCategory,
  hasWarnings: false,
  hasErrors: false,
};

export const mockTransactionWithWarning: Transaction = {
  ...mockTransaction,
  id: 'tx-2',
  hasWarnings: true,
  paymentPurpose: 'Неполное назначение платежа',
};

export const mockTransactionWithError: Transaction = {
  ...mockTransaction,
  id: 'tx-3',
  hasErrors: true,
  counterpartyName: '',
};

export const mockTransactionIncome: Transaction = {
  id: 'tx-4',
  transactionDate: '2024-01-16',
  documentNumber: 'ПП-001235',
  counterpartyName: 'АО "Клиент"',
  counterpartyBin: '987654321098',
  paymentPurpose: 'Оплата по счету №456',
  debit: 0,
  credit: 500000,
  currency: 'USD',
  transactionType: 'INCOME',
  category: mockCategories[1],
  hasWarnings: false,
  hasErrors: false,
};

export const mockTransactionUncategorized: Transaction = {
  ...mockTransaction,
  id: 'tx-5',
  category: undefined,
};

export const mockTransactionLongContent: Transaction = {
  ...mockTransaction,
  id: 'tx-6',
  counterpartyName:
    'ТОО "Очень Длинное Название Компании Которое Может Не Поместиться В Одну Строку И Требует Переноса"',
  paymentPurpose:
    'Оплата за оказанные услуги согласно Договору возмездного оказания услуг №12345/2024 от 15 января 2024 года, включая НДС 12%, сумма НДС составляет 16071.43 долларов. Назначение платежа очень длинное и содержит много деталей.',
};

export const mockTransactions: Transaction[] = [
  mockTransaction,
  mockTransactionIncome,
  mockTransactionWithWarning,
  mockTransactionWithError,
  mockTransactionUncategorized,
  mockTransactionLongContent,
  // Add more for scroll testing
  ...Array.from({ length: 20 }, (_, i) => ({
    ...mockTransaction,
    id: `tx-gen-${i}`,
    documentNumber: `ПП-00${1000 + i}`,
    debit: Math.floor(Math.random() * 1000000),
    transactionDate: `2024-01-${String(i + 1).padStart(2, '0')}`,
  })),
];

export const mockStatement: StatementDetails = {
  id: 'stmt-1',
  bankName: 'Halyk Bank',
  originalFilename: 'bank_statement_2024_01.pdf',
  createdAt: '2024-01-15T10:30:00Z',
  metadata: {
    accountNumber: 'KZ12345678901234567890',
    statementPeriodStart: '2024-01-01',
    statementPeriodEnd: '2024-01-31',
  },
};

export const mockStatementWithIssues: StatementDetails = {
  ...mockStatement,
  id: 'stmt-2',
};
