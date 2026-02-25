'use client';

import { cn } from '@/app/lib/utils';
import { Chip } from '@heroui/chip';
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type FilterChipButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode;
  active?: boolean;
};

export const FilterChipButton = forwardRef<HTMLButtonElement, FilterChipButtonProps>(
  ({ children, active = false, className, disabled, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          'group inline-flex rounded-full bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2',
          className,
        )}
        {...props}
      >
        <Chip
          radius="full"
          variant="bordered"
          classNames={{
            base: cn(
              'min-h-8 border px-0 transition-colors',
              active
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-gray-200 bg-white text-gray-700 group-hover:border-primary group-hover:text-primary',
              disabled ? 'opacity-60' : '',
            ),
            content:
              'flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-[13px] font-medium leading-none',
          }}
        >
          {children}
        </Chip>
      </button>
    );
  },
);

FilterChipButton.displayName = 'FilterChipButton';
