'use client';

import type { Column, Row } from '@tanstack/react-table';
import type { CSSProperties } from 'react';
import type { CustomTableGridRow } from '../../utils/stylingUtils';

interface FormulaCellProps {
  row: Row<CustomTableGridRow>;
  column: Column<CustomTableGridRow>;
  style?: CSSProperties;
  /** Показываем в подсказке, чтобы было видно, откуда взялось число. */
  expression?: string;
}

/**
 * Значение считает сервер, поэтому ячейка только для чтения: редактировать
 * результат формулы бессмысленно — он всё равно пересчитается.
 */
export function FormulaCell({ row, column, style, expression }: FormulaCellProps) {
  const raw = row.original.data[column.id];
  const display =
    typeof raw === 'number'
      ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(raw)
      : '—';

  return (
    <div
      title={expression}
      style={{
        width: '100%',
        height: '100%',
        padding: '4px 8px',
        textAlign: 'right',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: raw === null || raw === undefined ? 'var(--muted-foreground)' : undefined,
        ...style,
      }}
    >
      {display}
    </div>
  );
}
