'use client';

import { FilterActions } from '@/app/(main)/statements/components/filters/FilterActions';
import { FilterDropdown } from '@/app/(main)/statements/components/filters/FilterDropdown';
import { FilterOptionRow } from '@/app/(main)/statements/components/filters/FilterOptionRow';

type ViewFilterOption = {
  value: string;
  label: string;
};

type ViewFilterDropdownProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: ViewFilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  onApply: () => void;
  onReset: () => void;
  trigger: React.ReactNode;
  applyLabel: string;
  resetLabel: string;
};

export function ViewFilterDropdown({
  open,
  onOpenChange,
  options,
  value,
  onChange,
  onApply,
  onReset,
  trigger,
  applyLabel,
  resetLabel,
}: ViewFilterDropdownProps) {
  return (
    <FilterDropdown open={open} onOpenChange={onOpenChange} trigger={trigger}>
      <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
        {options.map(option => (
          <FilterOptionRow
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onClick={() => onChange(option.value)}
            variant="radio"
          />
        ))}
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
