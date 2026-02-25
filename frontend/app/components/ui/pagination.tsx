'use client';

import { Pagination } from '@heroui/react';
import type { PaginationProps } from '@heroui/react';

type AppPaginationProps = Omit<
  PaginationProps,
  'page' | 'total' | 'onChange' | 'showControls' | 'loop'
> & {
  page: number;
  total: number;
  onChange: (page: number) => void;
};

export function AppPagination({ page, total, onChange, className, ...props }: AppPaginationProps) {
  const safeTotal = Math.max(1, total);
  const safePage = Math.min(Math.max(1, page), safeTotal);

  return (
    <Pagination
      {...props}
      page={safePage}
      total={safeTotal}
      onChange={onChange}
      showControls
      loop
      isDisabled={safeTotal <= 1}
      className={className}
    />
  );
}
