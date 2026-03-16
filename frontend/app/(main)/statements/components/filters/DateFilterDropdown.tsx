'use client';

import { FilterActions } from '@/app/(main)/statements/components/filters/FilterActions';
import { FilterDropdown } from '@/app/(main)/statements/components/filters/FilterDropdown';
import { FilterOptionRow } from '@/app/(main)/statements/components/filters/FilterOptionRow';
import { RangeCalendar } from '@heroui/calendar';
import { parseDate } from '@internationalized/date';
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
  dateTo: value?.dateTo,
});

const toCalendarDate = (value?: string) => {
  if (!value) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
};

const resolveFallbackDate = () => new Date().toISOString().slice(0, 10);

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
  const calendarStart = toCalendarDate(current.date);
  const calendarEnd = toCalendarDate(current.dateTo || current.date);
  const calendarValue = calendarStart
    ? {
        start: calendarStart,
        end: calendarEnd || calendarStart,
      }
    : null;

  return (
    <FilterDropdown
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
    >
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
                    onChange(
                      option.value === 'on'
                        ? {
                            mode: option.value,
                            date: current.date ?? resolveFallbackDate(),
                            dateTo: current.dateTo || current.date || resolveFallbackDate(),
                          }
                        : {
                            mode: option.value,
                            date: current.date ?? resolveFallbackDate(),
                            dateTo: current.dateTo,
                          },
                    )
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
              <RangeCalendar
                aria-label="Date range"
                value={calendarValue as any}
                onChange={(range: any) => {
                  const startValue = range?.start?.toString?.();
                  const endValue = range?.end?.toString?.() || startValue;
                  const fallbackDate = current.date || resolveFallbackDate();

                  if (current.mode === 'after') {
                    onChange({
                      mode: current.mode,
                      date: startValue || fallbackDate,
                    });
                    return;
                  }

                  if (current.mode === 'before') {
                    onChange({
                      mode: current.mode,
                      date: endValue || startValue || fallbackDate,
                    });
                    return;
                  }

                  onChange({
                    mode: current.mode,
                    date: startValue || fallbackDate,
                    dateTo: endValue || startValue || fallbackDate,
                  });
                }}
                visibleMonths={1}
                className="w-full"
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
