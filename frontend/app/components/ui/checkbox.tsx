'use client';

import { cn } from '@/app/lib/utils';
import * as React from 'react';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        onChange={e => onCheckedChange?.(e.target.checked)}
        className={cn(
          'h-5 w-5 rounded border-border text-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer accent-primary',
          className,
        )}
        {...props}
      />
    );
  },
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
