"use client";

import { FilterActions } from "@/app/(main)/statements/components/filters/FilterActions";
import { FilterDropdown } from "@/app/(main)/statements/components/filters/FilterDropdown";
import { FilterOptionRow } from "@/app/(main)/statements/components/filters/FilterOptionRow";

type StatusFilterOption = {
  value: string;
  label: string;
};

type StatusFilterDropdownProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: StatusFilterOption[];
  values: string[];
  onChange: (values: string[]) => void;
  onApply: () => void;
  onReset: () => void;
  trigger: React.ReactNode;
  applyLabel: string;
  resetLabel: string;
};

export function StatusFilterDropdown({
  open,
  onOpenChange,
  options,
  values,
  onChange,
  onApply,
  onReset,
  trigger,
  applyLabel,
  resetLabel,
}: StatusFilterDropdownProps) {
  const selected = new Set(values);

  return (
    <FilterDropdown open={open} onOpenChange={onOpenChange} trigger={trigger}>
      <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
        {options.map((option) => {
          const isSelected = selected.has(option.value);
          return (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              selected={isSelected}
              onClick={() => {
                if (isSelected) {
                  onChange(values.filter((item) => item !== option.value));
                } else {
                  onChange([...values, option.value]);
                }
              }}
              variant="checkbox"
            />
          );
        })}
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
