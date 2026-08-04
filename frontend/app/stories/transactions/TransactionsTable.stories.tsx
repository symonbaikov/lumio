import { DEFAULT_CURRENCY } from '@/app/lib/format-money';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

/**
 * TransactionsTableContent - Pure presentational component for transactions table
 * For Storybook testing without intlayer/API dependencies
 */
interface Transaction {
  id: string;
  transactionDate: string;
  documentNumber?: string;
  counterpartyName: string;
  counterpartyBin?: string;
  paymentPurpose: string;
  debit: number;
  credit: number;
  currency?: string;
  transactionType: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category?: { name: string; color?: string };
  hasWarnings?: boolean;
  hasErrors?: boolean;
}

interface TransactionsTableContentProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onRowClick?: (transaction: Transaction) => void;
  onCategoryChange?: (transactionId: string, categoryId: string) => void;
}

function TransactionsTableContent({
  transactions,
  isLoading = false,
  onRowClick,
}: TransactionsTableContentProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  };

  const formatAmount = (amount: number, currency?: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency || DEFAULT_CURRENCY,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'Приход';
      case 'EXPENSE':
        return 'Расход';
      case 'TRANSFER':
        return 'Перевод';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'bg-green-100 text-green-800';
      case 'EXPENSE':
        return 'bg-red-100 text-red-800';
      case 'TRANSFER':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="animate-pulse">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-24" />
              ))}
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-4 border-b border-gray-100">
              <div className="flex gap-4">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="h-4 bg-gray-100 rounded w-24" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Нет транзакций</h3>
          <p className="text-sm text-gray-500">Транзакции появятся после загрузки выписки</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Дата
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Контрагент
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Назначение
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Расход
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Приход
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Тип
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Категория
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {transactions.map(tx => (
              <tr
                key={tx.id}
                className={`hover:bg-gray-50 transition-colors cursor-pointer ${tx.hasErrors ? 'bg-red-50' : tx.hasWarnings ? 'bg-amber-50' : ''}`}
                onClick={() => onRowClick?.(tx)}
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(tx.transactionDate)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">
                  {tx.counterpartyName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[250px] truncate">
                  {tx.paymentPurpose || '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-red-600">
                  {tx.debit > 0 ? formatAmount(tx.debit, tx.currency) : '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-green-600">
                  {tx.credit > 0 ? formatAmount(tx.credit, tx.currency) : '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(tx.transactionType)}`}
                  >
                    {getTypeLabel(tx.transactionType)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {tx.category ? (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: tx.category.color ? `${tx.category.color}20` : 'var(--border-color)',
                        color: tx.category.color || '#374151',
                      }}
                    >
                      {tx.category.name}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Story meta
const meta: Meta<typeof TransactionsTableContent> = {
  title: 'Transactions/TransactionsTable',
  component: TransactionsTableContent,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data
const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    transactionDate: '2024-01-15',
    documentNumber: 'ПП-001234',
    counterpartyName: 'ТОО "Пример Компании"',
    counterpartyBin: '123456789012',
    paymentPurpose: 'Оплата за услуги по договору №123',
    debit: 150000,
    credit: 0,
    currency: 'USD',
    transactionType: 'EXPENSE',
    category: { name: 'Операционные расходы', color: '#3b82f6' },
  },
  {
    id: 'tx-2',
    transactionDate: '2024-01-16',
    counterpartyName: 'АО "Клиент"',
    paymentPurpose: 'Оплата по счету №456',
    debit: 0,
    credit: 500000,
    currency: 'USD',
    transactionType: 'INCOME',
    category: { name: 'Доход', color: '#10b981' },
  },
  {
    id: 'tx-3',
    transactionDate: '2024-01-17',
    counterpartyName: 'ИП Иванов',
    paymentPurpose: 'Перевод между счетами',
    debit: 0,
    credit: 100000,
    currency: 'USD',
    transactionType: 'TRANSFER',
  },
  {
    id: 'tx-4',
    transactionDate: '2024-01-18',
    counterpartyName: 'ТОО "Поставщик"',
    paymentPurpose: 'Закупка товаров',
    debit: 250000,
    credit: 0,
    currency: 'USD',
    transactionType: 'EXPENSE',
    hasWarnings: true,
  },
  {
    id: 'tx-5',
    transactionDate: '2024-01-19',
    counterpartyName: '',
    paymentPurpose: 'Неизвестная операция',
    debit: 50000,
    credit: 0,
    currency: 'USD',
    transactionType: 'EXPENSE',
    hasErrors: true,
  },
];

// Default
export const Default: Story = {
  args: {
    transactions: mockTransactions,
    onRowClick: (tx: Transaction) => alert(`Clicked: ${tx.counterpartyName}`),
  },
};

// Loading state
export const Loading: Story = {
  args: {
    transactions: [],
    isLoading: true,
  },
};

// Empty state
export const Empty: Story = {
  args: {
    transactions: [],
    isLoading: false,
  },
};

// Many transactions (scroll)
export const ManyTransactions: Story = {
  args: {
    transactions: [
      ...mockTransactions,
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `tx-gen-${i}`,
        transactionDate: `2024-01-${String(20 + i).padStart(2, '0')}`,
        counterpartyName: `Контрагент ${i + 1}`,
        paymentPurpose: `Платёж №${i + 1}`,
        debit: Math.random() > 0.5 ? Math.floor(Math.random() * 500000) : 0,
        credit: Math.random() > 0.5 ? Math.floor(Math.random() * 500000) : 0,
        currency: 'USD',
        transactionType: (['INCOME', 'EXPENSE', 'TRANSFER'] as const)[i % 3],
      })),
    ],
    onRowClick: (tx: Transaction) => alert(`Clicked: ${tx.counterpartyName}`),
  },
};

// With warnings and errors
export const WithIssues: Story = {
  args: {
    transactions: mockTransactions.filter(tx => tx.hasWarnings || tx.hasErrors),
    onRowClick: (tx: Transaction) => alert(`Clicked: ${tx.counterpartyName}`),
  },
};

// Mobile viewport
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
  args: {
    transactions: mockTransactions.slice(0, 3),
    onRowClick: (tx: Transaction) => alert(`Clicked: ${tx.counterpartyName}`),
  },
};
