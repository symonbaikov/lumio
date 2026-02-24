'use client';

import { cn } from '@/app/lib/utils';
import * as React from 'react';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground',
        'focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[inset_0_0_0_2px_hsl(var(--primary)/0.28)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export { Select };
