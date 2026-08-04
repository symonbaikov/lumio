import { DEFAULT_CURRENCY } from '@/app/lib/format-money';
import type { Meta, StoryObj } from '@storybook/react';
import { Download, FileText, Share2, TrendingDown, TrendingUp } from '@/app/components/icons';

/**
 * SummaryBarContent - Pure presentational component for statement summary
 * For Storybook testing without intlayer dependency
 */
interface SummaryBarStats {
  totalParsed: number;
  totalWarnings: number;
  totalErrors: number;
  uncategorized: number;
  debitTotal: number;
  creditTotal: number;
  currency: string;
}

interface SummaryBarContentProps {
  bankName: string;
  accountNumber?: string;
  uploadedAt: string;
  stats: SummaryBarStats;
  onExport?: () => void;
  onShare?: () => void;
  onFixIssues?: () => void;
}

function SummaryBarContent({
  bankName,
  accountNumber,
  uploadedAt,
  stats,
  onExport,
  onShare,
  onFixIssues,
}: SummaryBarContentProps) {
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency || DEFAULT_CURRENCY,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left section: File metadata and parsing status */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                <span className="font-semibold">{bankName}</span>
                {accountNumber && (
                  <>
                    <span>•</span>
                    <span>{accountNumber}</span>
                  </>
                )}
              </div>
              <div className="text-xs text-gray-500">Загружено: {uploadedAt}</div>
            </div>
          </div>

          {/* Parsing status */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Распознано: {stats.totalParsed}
            </div>
            {stats.totalWarnings > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                Предупреждения: {stats.totalWarnings}
              </div>
            )}
            {stats.totalErrors > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                Ошибки: {stats.totalErrors}
              </div>
            )}
            {stats.uncategorized > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                Без категории: {stats.uncategorized}
              </div>
            )}
          </div>
        </div>

        {/* Right section: Financial totals and actions */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Debit Total */}
            <div className="rounded-lg border border-red-100 bg-red-50/50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-600">
                <TrendingDown className="h-4 w-4" />
                Расход
              </div>
              <div className="mt-1 text-lg font-bold text-red-700">
                {formatAmount(stats.debitTotal, stats.currency)}
              </div>
            </div>

            {/* Credit Total */}
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                <TrendingUp className="h-4 w-4" />
                Приход
              </div>
              <div className="mt-1 text-lg font-bold text-emerald-700">
                {formatAmount(stats.creditTotal, stats.currency)}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {(stats.totalErrors > 0 || stats.uncategorized > 0) && (
              <button
                type="button"
                onClick={onFixIssues}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                Исправить проблемы
              </button>
            )}
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Экспорт
            </button>
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Share2 className="h-4 w-4" />
              Поделиться
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Story meta
const meta: Meta<typeof SummaryBarContent> = {
  title: 'Transactions/SummaryBar',
  component: SummaryBarContent,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default state
export const Default: Story = {
  args: {
    bankName: 'Halyk Bank',
    accountNumber: 'KZ12345678901234567890',
    uploadedAt: '15 января 2024',
    stats: {
      totalParsed: 156,
      totalWarnings: 0,
      totalErrors: 0,
      uncategorized: 0,
      debitTotal: 2500000,
      creditTotal: 3200000,
      currency: 'USD',
    },
    onExport: () => alert('Export clicked'),
    onShare: () => alert('Share clicked'),
  },
};

// With warnings
export const WithWarnings: Story = {
  args: {
    bankName: 'Kaspi Bank',
    accountNumber: 'KZ98765432109876543210',
    uploadedAt: '10 января 2024',
    stats: {
      totalParsed: 89,
      totalWarnings: 5,
      totalErrors: 0,
      uncategorized: 12,
      debitTotal: 1800000,
      creditTotal: 2100000,
      currency: 'USD',
    },
    onExport: () => alert('Export clicked'),
    onShare: () => alert('Share clicked'),
    onFixIssues: () => alert('Fix issues clicked'),
  },
};

// With errors
export const WithErrors: Story = {
  args: {
    bankName: 'Jusan Bank',
    uploadedAt: '5 января 2024',
    stats: {
      totalParsed: 45,
      totalWarnings: 3,
      totalErrors: 8,
      uncategorized: 20,
      debitTotal: 500000,
      creditTotal: 750000,
      currency: 'USD',
    },
    onExport: () => alert('Export clicked'),
    onShare: () => alert('Share clicked'),
    onFixIssues: () => alert('Fix issues clicked'),
  },
};

// Empty (zero totals)
export const Empty: Story = {
  args: {
    bankName: 'BCC',
    uploadedAt: '1 января 2024',
    stats: {
      totalParsed: 0,
      totalWarnings: 0,
      totalErrors: 0,
      uncategorized: 0,
      debitTotal: 0,
      creditTotal: 0,
      currency: 'USD',
    },
    onExport: () => alert('Export clicked'),
    onShare: () => alert('Share clicked'),
  },
};

// USD currency
export const USDCurrency: Story = {
  args: {
    bankName: 'Halyk Bank',
    accountNumber: 'KZ12345678901234567890',
    uploadedAt: '15 января 2024',
    stats: {
      totalParsed: 25,
      totalWarnings: 0,
      totalErrors: 0,
      uncategorized: 0,
      debitTotal: 15000,
      creditTotal: 22000,
      currency: 'USD',
    },
    onExport: () => alert('Export clicked'),
    onShare: () => alert('Share clicked'),
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
    bankName: 'Halyk Bank',
    accountNumber: 'KZ12345678901234567890',
    uploadedAt: '15 января 2024',
    stats: {
      totalParsed: 156,
      totalWarnings: 2,
      totalErrors: 1,
      uncategorized: 5,
      debitTotal: 2500000,
      creditTotal: 3200000,
      currency: 'USD',
    },
    onExport: () => alert('Export clicked'),
    onShare: () => alert('Share clicked'),
    onFixIssues: () => alert('Fix issues clicked'),
  },
};
