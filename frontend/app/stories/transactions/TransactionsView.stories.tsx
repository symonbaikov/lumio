import { DEFAULT_CURRENCY } from '@/app/lib/format-money';
import type { Meta, StoryObj } from '@storybook/react';
import { ChevronLeft, ChevronRight, Search } from '@/app/components/icons';
import { useState } from 'react';

/**
 * TransactionsViewContent - Pure presentational component for transactions view with search and pagination
 * For Storybook testing without intlayer/MUI dependencies
 */
interface Transaction {
  id: string;
  transactionDate: string;
  documentNumber?: string;
  counterpartyName: string;
  paymentPurpose: string;
  debit: number;
  credit: number;
  currency?: string;
  transactionType: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category?: { name: string };
}

interface TransactionsViewContentProps {
  transactions: Transaction[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  page?: number;
  rowsPerPage?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (transaction: Transaction) => void;
}

function TransactionsViewContent({
  transactions,
  searchQuery = '',
  onSearchChange,
  page = 0,
  rowsPerPage = 10,
  totalCount = 0,
  onPageChange,
  onRowClick,
}: TransactionsViewContentProps) {
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

  const startItem = page * rowsPerPage + 1;
  const endItem = Math.min((page + 1) * rowsPerPage, totalCount);
  const totalPages = Math.ceil(totalCount / rowsPerPage);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Поиск по контрагенту, назначению, категории..."
          value={searchQuery}
          onChange={e => onSearchChange?.(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Ничего не найдено</h3>
            <p className="text-sm text-gray-500">Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Дата
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Контрагент
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Назначение
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Расход
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Приход
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Тип
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {transactions.map(tx => (
                  <tr
                    key={tx.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onRowClick?.(tx)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(tx.transactionDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">
                      {tx.counterpartyName || '—'}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-gray-600">
            {startItem}–{endItem} из {totalCount}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page === 0}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600">
              Страница {page + 1} из {totalPages}
            </span>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Story meta
const meta: Meta<typeof TransactionsViewContent> = {
  title: 'Transactions/TransactionsView',
  component: TransactionsViewContent,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data
const mockTransactions: Transaction[] = Array.from({ length: 25 }, (_, i) => ({
  id: `tx-${i}`,
  transactionDate: `2024-01-${String(i + 1).padStart(2, '0')}`,
  documentNumber: `ПП-00${1000 + i}`,
  counterpartyName: `Контрагент ${i + 1}`,
  paymentPurpose: `Платёж по договору №${i + 1}`,
  debit: i % 2 === 0 ? Math.floor(Math.random() * 500000) : 0,
  credit: i % 2 !== 0 ? Math.floor(Math.random() * 500000) : 0,
  currency: 'USD',
  transactionType: (['INCOME', 'EXPENSE', 'TRANSFER'] as const)[i % 3],
  category: i % 4 !== 0 ? { name: `Категория ${(i % 5) + 1}` } : undefined,
}));

// Default with pagination
export const Default: Story = {
  render: () => {
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const rowsPerPage = 10;

    const filtered = mockTransactions.filter(
      tx =>
        tx.counterpartyName.toLowerCase().includes(search.toLowerCase()) ||
        tx.paymentPurpose.toLowerCase().includes(search.toLowerCase()),
    );
    const paged = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

    return (
      <TransactionsViewContent
        transactions={paged}
        searchQuery={search}
        onSearchChange={q => {
          setSearch(q);
          setPage(0);
        }}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={filtered.length}
        onPageChange={setPage}
        onRowClick={(tx: Transaction) => alert(`Clicked: ${tx.counterpartyName}`)}
      />
    );
  },
};

// Empty / no results
export const Empty: Story = {
  args: {
    transactions: [],
    searchQuery: 'несуществующий запрос',
    totalCount: 0,
  },
};

// Filtered results
export const Filtered: Story = {
  render: () => {
    const [search, setSearch] = useState('Контрагент 1');

    const filtered = mockTransactions.filter(tx =>
      tx.counterpartyName.toLowerCase().includes(search.toLowerCase()),
    );

    return (
      <TransactionsViewContent
        transactions={filtered.slice(0, 10)}
        searchQuery={search}
        onSearchChange={setSearch}
        page={0}
        rowsPerPage={10}
        totalCount={filtered.length}
        onRowClick={(tx: Transaction) => alert(`Clicked: ${tx.counterpartyName}`)}
      />
    );
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
    transactions: mockTransactions.slice(0, 5),
    page: 0,
    rowsPerPage: 5,
    totalCount: mockTransactions.length,
    onRowClick: (tx: Transaction) => alert(`Clicked: ${tx.counterpartyName}`),
  },
};
