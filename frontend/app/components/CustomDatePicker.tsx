'use client';

import { DatePicker } from '@heroui/date-picker';
import { type DateValue, parseDate } from '@internationalized/date';
import { format } from 'date-fns';

interface CustomDatePickerProps {
  value?: string | null;
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  containerTestId?: string;
}

const DATE_VALUE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const normalizeToDateString = (value?: string | null) => {
  if (!value) {
    return null;
  }

  if (DATE_VALUE_REGEX.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return format(parsed, 'yyyy-MM-dd');
};

const toCalendarDate = (value?: string | null) => {
  const normalized = normalizeToDateString(value);
  if (!normalized) {
    return null;
  }

  try {
    return parseDate(normalized);
  } catch {
    return null;
  }
};

export default function CustomDatePicker({
  value,
  onChange,
  label,
  placeholder,
  helperText,
  containerTestId,
}: CustomDatePickerProps) {
  const calendarValue = toCalendarDate(value);

  const handleChange = (date: DateValue | null) => {
    onChange(date ? date.toString() : '');
  };

  return (
    <div data-testid={containerTestId}>
      {label ? (
        <span className="text-xs text-gray-500 block mb-1 font-medium ml-1">{label}</span>
      ) : null}
      <DatePicker
        aria-label={label ?? placeholder ?? 'Date'}
        value={calendarValue}
        onChange={handleChange}
        granularity="day"
        showMonthAndYearPickers
        className="w-full"
        classNames={{
          base: 'w-full',
          inputWrapper:
            'h-10 min-h-[40px] rounded-md border border-gray-300 bg-white px-3 py-0 shadow-none transition-colors hover:border-[var(--mui-palette-primary-main)] group-data-[focus=true]:border-[var(--mui-palette-primary-main)] group-data-[focus=true]:ring-0',
          innerWrapper: 'h-full gap-x-2',
          input: 'text-sm text-gray-900',
          segment: 'text-sm text-gray-900 leading-none',
          selectorButton: 'h-8 w-8 min-w-8 text-gray-500',
        }}
      />
      {helperText ? <p className="mt-1 ml-3.5 text-xs text-gray-500">{helperText}</p> : null}
    </div>
  );
}
