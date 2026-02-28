'use client';

import type { DashboardRange } from '@/app/hooks/useDashboard';

interface RangeSwitcherProps {
  value: DashboardRange;
  onChange: (range: DashboardRange) => void;
  labels: Record<DashboardRange, string>;
}

const RANGES: DashboardRange[] = ['7d', '30d', '90d'];

export function RangeSwitcher({ value, onChange, labels }: RangeSwitcherProps) {
  return (
    <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      {RANGES.map(range => (
        <button
          key={range}
          type="button"
          onClick={() => onChange(range)}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
            value === range
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {labels[range]}
        </button>
      ))}
    </div>
  );
}
