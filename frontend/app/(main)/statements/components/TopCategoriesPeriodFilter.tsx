'use client';

import { cn } from '@/app/lib/utils';

export type TopCategoriesPeriodPreset = '7d' | '30d' | '90d' | '1y' | 'custom';

type Props = {
  period: TopCategoriesPeriodPreset;
  customFrom: string;
  customTo: string;
  onPeriodChange: (value: TopCategoriesPeriodPreset) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
};

const presets: Array<{ id: TopCategoriesPeriodPreset; label: string }> = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '1y', label: '1 year' },
  { id: 'custom', label: 'Custom' },
];

export default function TopCategoriesPeriodFilter({
  period,
  customFrom,
  customTo,
  onPeriodChange,
  onCustomFromChange,
  onCustomToChange,
}: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        {presets.map(preset => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onPeriodChange(preset.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              period === preset.id
                ? 'border-primary bg-primary text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {period === 'custom' ? (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm text-gray-600">
            From
            <input
              type="date"
              value={customFrom}
              onChange={event => onCustomFromChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <label className="text-sm text-gray-600">
            To
            <input
              type="date"
              value={customTo}
              onChange={event => onCustomToChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
