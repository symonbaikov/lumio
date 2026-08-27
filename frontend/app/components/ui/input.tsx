'use client';

import OutlinedInput from '@mui/material/OutlinedInput';
import * as React from 'react';

/**
 * Shared sizing for form controls (Wise-style: tall target, 16px text so the
 * value stays readable and iOS does not zoom on focus).
 */
export const FORM_CONTROL_SX = { height: 48, fontSize: 16 } as const;

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** MUI input slot props for adornments */
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  error?: boolean;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startAdornment, endAdornment, error, style, ...props }, ref) => (
    <OutlinedInput
      inputRef={ref}
      type={type}
      error={error}
      className={className}
      style={style}
      startAdornment={startAdornment}
      endAdornment={endAdornment}
      inputProps={props as React.InputHTMLAttributes<HTMLInputElement>}
      sx={{ width: '100%', ...FORM_CONTROL_SX }}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
