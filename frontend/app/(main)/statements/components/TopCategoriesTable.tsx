'use client';

import { BankLogoAvatar } from '@/app/components/BankLogoAvatar';

type Row = {
  name: string;
  amount: number;
  percentage: number;
  count: number;
  color?: string | null;
  bankName?: string | null;
};

type Props = {
  title: string;
  rows: Row[];
};

const formatAmount = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export default function TopCategoriesTable({ title, rows }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-800">
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Share</th>
              <th className="px-4 py-3 text-right">Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.name}-${index}`} className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {row.bankName ? (
                      <BankLogoAvatar bankName={row.bankName} size={18} rounded={false} />
                    ) : row.color ? (
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                    ) : (
                      <span className="h-3 w-3 rounded-full bg-gray-300" />
                    )}
                    <span className="font-medium text-gray-900">{row.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  {formatAmount(row.amount)}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{row.percentage.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right text-gray-600">{row.count}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>
                  No data for selected filters
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
