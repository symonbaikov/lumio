import { DEFAULT_CURRENCY } from '@/app/lib/format-money';
import { Button } from '@/app/components/ui/button';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import type { Meta, StoryObj } from '@storybook/react';
import { Building2, Calendar, FileText, Tag, TrendingDown, TrendingUp } from '@/app/components/icons';
import { useState } from 'react';

/**
 * DetailsDrawerContent - Pure presentational component for transaction details
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
  exchangeRate?: number;
  article?: string;
  category?: { id: string; name: string; color?: string };
  branch?: { name: string };
  wallet?: { name: string };
  parsingConfidence?: number;
  rawExtract?: string;
}

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface DetailsDrawerContentProps {
  transaction: Transaction;
  categories: Category[];
  onUpdateCategory?: (categoryId: string) => void;
  onMarkIgnored?: () => void;
  isUpdating?: boolean;
}

function DetailsDrawerContent({
  transaction,
  categories,
  onUpdateCategory,
  onMarkIgnored,
  isUpdating = false,
}: DetailsDrawerContentProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency?: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency || DEFAULT_CURRENCY,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Date and Document */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-gray-100 p-2">
            <Calendar className="h-5 w-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Дата</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {formatDate(transaction.transactionDate)}
            </div>
          </div>
        </div>

        {transaction.documentNumber && (
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-gray-100 p-2">
              <FileText className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Номер документа
              </div>
              <div className="mt-1 text-sm font-semibold text-gray-900">
                {transaction.documentNumber}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Counterparty */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white p-2 shadow-sm">
            <Building2 className="h-5 w-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Контрагент
            </div>
            <div className="mt-1 text-sm font-bold text-gray-900">
              {transaction.counterpartyName}
            </div>
            {transaction.counterpartyBin && (
              <div className="mt-1 text-xs text-gray-600">БИН: {transaction.counterpartyBin}</div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Purpose */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Назначение платежа
        </div>
        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900">
          {transaction.paymentPurpose || '—'}
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-600">
            <TrendingDown className="h-4 w-4" />
            Расход
          </div>
          <div className="mt-2 text-lg font-bold text-red-700">
            {transaction.debit > 0 ? formatAmount(transaction.debit, transaction.currency) : '—'}
          </div>
        </div>

        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
            <TrendingUp className="h-4 w-4" />
            Приход
          </div>
          <div className="mt-2 text-lg font-bold text-emerald-700">
            {transaction.credit > 0 ? formatAmount(transaction.credit, transaction.currency) : '—'}
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-700">
          Дополнительно
        </div>

        {transaction.currency && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Валюта:</span>
            <span className="font-semibold text-gray-900">{transaction.currency}</span>
          </div>
        )}

        {transaction.exchangeRate && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Курс:</span>
            <span className="font-semibold text-gray-900">
              {transaction.exchangeRate.toFixed(4)}
            </span>
          </div>
        )}

        {transaction.article && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Статья:</span>
            <span className="font-semibold text-gray-900">{transaction.article}</span>
          </div>
        )}

        {transaction.branch?.name && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Филиал:</span>
            <span className="font-semibold text-gray-900">{transaction.branch.name}</span>
          </div>
        )}
      </div>

      {/* Current Category */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
          <Tag className="h-4 w-4" />
          Текущая категория
        </div>
        <div className="mt-2">
          {transaction.category ? (
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold"
              style={{
                backgroundColor: transaction.category.color
                  ? `${transaction.category.color}15`
                  : 'var(--border-color)',
                color: transaction.category.color || '#374151',
              }}
            >
              {transaction.category.name}
            </span>
          ) : (
            <span className="text-sm text-gray-500">Без категории</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 border-t border-gray-200 pt-6">
        <div className="text-sm font-semibold text-gray-900">Действия</div>

        {onUpdateCategory && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700">
              Установить категорию
            </label>
            <div className="flex gap-2">
              <select
                value={selectedCategoryId}
                onChange={e => setSelectedCategoryId(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Выберите категорию</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => onUpdateCategory(selectedCategoryId)}
                disabled={!selectedCategoryId || isUpdating}
                size="sm"
              >
                {isUpdating ? 'Сохранение...' : 'Применить'}
              </Button>
            </div>
          </div>
        )}

        {onMarkIgnored && (
          <Button variant="outline" onClick={onMarkIgnored} className="w-full">
            Игнорировать
          </Button>
        )}
      </div>
    </div>
  );
}

// Story meta
const meta: Meta<typeof DetailsDrawerContent> = {
  title: 'Transactions/DetailsDrawer',
  component: DetailsDrawerContent,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data
const mockTransaction: Transaction = {
  id: 'tx-1',
  transactionDate: '2024-01-15',
  documentNumber: 'ПП-001234',
  counterpartyName: 'ТОО "Пример Компании"',
  counterpartyBin: '123456789012',
  paymentPurpose: 'Оплата за услуги по договору №123 от 01.01.2024',
  debit: 150000,
  credit: 0,
  currency: 'USD',
  category: { id: 'cat-1', name: 'Операционные расходы', color: '#3b82f6' },
};

const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Операционные расходы', color: '#3b82f6' },
  { id: 'cat-2', name: 'Зарплата', color: '#10b981' },
  { id: 'cat-3', name: 'Налоги', color: 'var(--destructive)' },
  { id: 'cat-4', name: 'Аренда', color: '#f59e0b' },
];

// Interactive wrapper
const DrawerWrapper = ({
  children,
  buttonText = 'Показать детали',
}: {
  children: (props: { isOpen: boolean; onClose: () => void }) => React.ReactNode;
  buttonText?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="p-8">
      <Button onClick={() => setIsOpen(true)}>{buttonText}</Button>
      {children({ isOpen, onClose: () => setIsOpen(false) })}
    </div>
  );
};

// Default
export const Default: Story = {
  render: () => (
    <DrawerWrapper>
      {({ isOpen, onClose }) => (
        <DrawerShell isOpen={isOpen} onClose={onClose} title="Детали транзакции" width="md">
          <DetailsDrawerContent
            transaction={mockTransaction}
            categories={mockCategories}
            onUpdateCategory={catId => alert(`Update category: ${catId}`)}
            onMarkIgnored={() => alert('Mark ignored')}
          />
        </DrawerShell>
      )}
    </DrawerWrapper>
  ),
};

// No category (uncategorized)
export const NoCategory: Story = {
  render: () => (
    <DrawerWrapper buttonText="Без категории">
      {({ isOpen, onClose }) => (
        <DrawerShell isOpen={isOpen} onClose={onClose} title="Детали транзакции" width="md">
          <DetailsDrawerContent
            transaction={{ ...mockTransaction, category: undefined }}
            categories={mockCategories}
            onUpdateCategory={catId => alert(`Update category: ${catId}`)}
            onMarkIgnored={() => alert('Mark ignored')}
          />
        </DrawerShell>
      )}
    </DrawerWrapper>
  ),
};

// Income transaction
export const Income: Story = {
  render: () => (
    <DrawerWrapper buttonText="Приход">
      {({ isOpen, onClose }) => (
        <DrawerShell isOpen={isOpen} onClose={onClose} title="Детали транзакции" width="md">
          <DetailsDrawerContent
            transaction={{
              ...mockTransaction,
              debit: 0,
              credit: 500000,
              counterpartyName: 'АО "Клиент"',
              paymentPurpose: 'Оплата по счету №456',
              category: { id: 'cat-income', name: 'Доход', color: '#10b981' },
            }}
            categories={mockCategories}
            onUpdateCategory={catId => alert(`Update category: ${catId}`)}
          />
        </DrawerShell>
      )}
    </DrawerWrapper>
  ),
};

// Long content
export const LongContent: Story = {
  render: () => (
    <DrawerWrapper buttonText="Длинное содержимое">
      {({ isOpen, onClose }) => (
        <DrawerShell isOpen={isOpen} onClose={onClose} title="Детали транзакции" width="md">
          <DetailsDrawerContent
            transaction={{
              ...mockTransaction,
              counterpartyName:
                'ТОО "Очень Длинное Название Компании Которое Может Не Поместиться В Одну Строку"',
              paymentPurpose:
                'Оплата за оказанные услуги согласно Договору возмездного оказания услуг №12345/2024 от 15 января 2024 года, включая НДС 12%, сумма НДС составляет 16071.43 долларов. Назначение платежа содержит много деталей о транзакции и её целях. Также в назначении может быть указана дополнительная информация о контрагенте и условиях договора.',
              article: 'Услуги консалтинга',
              branch: { name: 'Алматинский филиал' },
              wallet: { name: 'Основной счёт' },
              exchangeRate: 1.0,
            }}
            categories={mockCategories}
            onUpdateCategory={catId => alert(`Update category: ${catId}`)}
            onMarkIgnored={() => alert('Mark ignored')}
          />
        </DrawerShell>
      )}
    </DrawerWrapper>
  ),
};

// With parsing metadata
export const WithParsingMetadata: Story = {
  render: () => (
    <DrawerWrapper buttonText="С метаданными парсинга">
      {({ isOpen, onClose }) => (
        <DrawerShell isOpen={isOpen} onClose={onClose} title="Детали транзакции" width="md">
          <DetailsDrawerContent
            transaction={{
              ...mockTransaction,
              parsingConfidence: 0.95,
              rawExtract: 'Исходный текст из PDF документа...',
            }}
            categories={mockCategories}
            onUpdateCategory={catId => alert(`Update category: ${catId}`)}
          />
        </DrawerShell>
      )}
    </DrawerWrapper>
  ),
};

// Readonly (no actions)
export const Readonly: Story = {
  render: () => (
    <DrawerWrapper buttonText="Только просмотр">
      {({ isOpen, onClose }) => (
        <DrawerShell isOpen={isOpen} onClose={onClose} title="Детали транзакции" width="md">
          <DetailsDrawerContent transaction={mockTransaction} categories={[]} />
        </DrawerShell>
      )}
    </DrawerWrapper>
  ),
};

// Mobile viewport
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
  render: () => (
    <DrawerWrapper>
      {({ isOpen, onClose }) => (
        <DrawerShell isOpen={isOpen} onClose={onClose} title="Детали" width="sm">
          <DetailsDrawerContent
            transaction={mockTransaction}
            categories={mockCategories}
            onUpdateCategory={catId => alert(`Update category: ${catId}`)}
            onMarkIgnored={() => alert('Mark ignored')}
          />
        </DrawerShell>
      )}
    </DrawerWrapper>
  ),
};
