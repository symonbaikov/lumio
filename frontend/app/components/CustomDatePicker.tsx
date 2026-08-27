'use client';

import { FORM_CONTROL_SX } from '@/app/components/ui/input';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isValid, parseISO } from 'date-fns';
import type React from 'react';

interface CustomDatePickerProps {
  value?: string | null;
  onChange: (date: string) => void;
  label?: React.ReactNode;
  placeholder?: string;
  helperText?: string;
  containerTestId?: string;
  /** Match the tall form-control sizing used by Input/Select. */
  large?: boolean;
}

const DATE_VALUE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const normalizeToDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }

  if (DATE_VALUE_REGEX.test(value)) {
    const d = parseISO(value);
    return isValid(d) ? d : null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, max-lines-per-function
export default function CustomDatePicker({
  value,
  onChange,
  label,
  placeholder,
  helperText,
  containerTestId,
  large,
}: CustomDatePickerProps) {
  const dateValue = normalizeToDate(value);

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const handleChange = (date: Date | null) => {
    if (date && isValid(date)) {
      onChange(format(date, 'yyyy-MM-dd'));
    } else {
      onChange('');
    }
  };

  return (
    <div data-testid={containerTestId}>
      <DatePicker
        label={label}
        value={dateValue}
        onChange={handleChange}
        slotProps={{
          textField: {
            fullWidth: true,
            size: large ? 'medium' : 'small',
            sx: large ? { '& .MuiInputBase-root': FORM_CONTROL_SX } : undefined,
            helperText: helperText,
            placeholder: placeholder,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        }}
      />
    </div>
  );
}
