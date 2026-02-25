'use client';

import { cn } from '@/app/lib/utils';
import { Checkbox as HeroCheckbox } from '@heroui/react';
import * as React from 'react';

export interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<typeof HeroCheckbox>, 'onValueChange'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      classNames,
      checked,
      defaultChecked,
      disabled,
      indeterminate,
      onCheckedChange,
      onChange,
      color = 'primary',
      radius = 'sm',
      size = 'md',
      ...props
    },
    ref,
  ) => {
    const wrapperSizeClass =
      size === 'sm' ? '!h-4 !w-4' : size === 'lg' ? '!h-6 !w-6' : '!h-5 !w-5';

    const handleValueChange = (nextChecked: boolean) => {
      onCheckedChange?.(nextChecked);
      if (onChange) {
        const syntheticEvent = {
          target: { checked: nextChecked },
          currentTarget: { checked: nextChecked },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    return (
      <HeroCheckbox
        ref={ref}
        isSelected={checked}
        defaultSelected={defaultChecked}
        isDisabled={disabled}
        isIndeterminate={indeterminate}
        onValueChange={handleValueChange}
        color={color}
        radius={radius}
        size={size}
        className="select-none"
        classNames={{
          base: cn('m-0 p-0 shrink-0 overflow-visible', classNames?.base),
          wrapper: cn(
            wrapperSizeClass,
            '!rounded-[6px] border-gray-300 data-[selected=true]:border-primary',
            className,
            classNames?.wrapper,
          ),
          icon: cn('text-white', classNames?.icon),
          label: classNames?.label,
        }}
        {...props}
      />
    );
  },
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
