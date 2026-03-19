'use client';

import type { DashboardRange } from '@/app/hooks/useDashboard';
import React, { useEffect, useRef, useState } from 'react';

interface PeriodDropdownProps {
  value: DashboardRange;
  onChange: (range: DashboardRange) => void;
}

const LABELS: Record<DashboardRange, string> = {
  '7d': 'Weekly',
  '30d': 'Monthly',
  '90d': 'Quarterly',
};

export function PeriodDropdown({ value, onChange }: PeriodDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-xs text-slate-400 font-medium flex items-center gap-1 hover:text-slate-600"
      >
        {LABELS[value]} <span className="text-[10px]">▼</span>
      </button>
      {open ? (
        <div className="absolute right-0 mt-1 w-[140px] rounded-none border border-[#E8E8E8] bg-white shadow-none z-10">
          {(Object.entries(LABELS) as [DashboardRange, string][]).map(([r, label]) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                onChange(r);
                setOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                value === r ? 'text-blue-600 font-semibold' : 'text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
