'use client';

import { FilterActions } from '@/app/(main)/statements/components/filters/FilterActions';
import { FilterDropdown } from '@/app/(main)/statements/components/filters/FilterDropdown';
import { FilterOptionRow } from '@/app/(main)/statements/components/filters/FilterOptionRow';
import { ChevronRight } from 'lucide-react';
import type {
  StatementFilterDate,
  StatementFilterDateMode,
  StatementFilterDatePreset,
} from './statement-filters';

type DatePresetOption = {
  value: StatementFilterDatePreset;
  label: string;
};

type DateModeOption = {
  value: StatementFilterDateMode;
  label: string;
};

type DateFilterDropdownProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presets: DatePresetOption[];
  modes: DateModeOption[];
  value: StatementFilterDate | null;
  onChange: (value: StatementFilterDate | null) => void;
  onApply: () => void;
  onReset: () => void;
  trigger: React.ReactNode;
  applyLabel: string;
  resetLabel: string;
};

const ensureDate = (value?: StatementFilterDate | null): StatementFilterDate => ({
  preset: value?.preset,
  mode: value?.mode,
  date: value?.date,
});

export function DateFilterDropdown({
  open,
  onOpenChange,
  presets,
  modes,
  value,
  onChange,
  onApply,
  onReset,
  trigger,
  applyLabel,
  resetLabel,
}: DateFilterDropdownProps) {
  const current = ensureDate(value);

  return (
    <FilterDropdown open={open} onOpenChange={onOpenChange} trigger={trigger}>
      <div className="space-y-2">
        <div className="space-y-1">
          {presets.map(option => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              selected={current.preset === option.value}
              onClick={() => onChange({ preset: option.value })}
              variant="radio"
            />
          ))}
        </div>

        <div className="border-t border-gray-200 pt-2">
          <div className="space-y-1">
            {modes.map(option => {
              const isSelected = current.mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    onChange({
                      mode: option.value,
                      date: current.date ?? new Date().toISOString().slice(0, 10),
                    })
                  }
                  className="flex w-full items-center justify-between rounded-xl px-2 py-3 text-left text-base font-semibold text-gray-900 transition hover:bg-gray-50"
                >
                  <span>{option.label}</span>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                  {isSelected ? null : null}
                </button>
              );
            })}
          </div>

          {current.mode && (
            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-3">
              <input
                type="date"
                value={current.date ?? ''}
                onChange={event =>
                  onChange({
                    mode: current.mode,
                    date: event.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
          )}
        </div>
      </div>

      <FilterActions
        onReset={onReset}
        onApply={onApply}
        applyLabel={applyLabel}
        resetLabel={resetLabel}
      />
    </FilterDropdown>
  );
}
