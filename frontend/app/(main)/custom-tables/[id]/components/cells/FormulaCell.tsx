'use client';

import type { Column, Row } from '@tanstack/react-table';
import type { CSSProperties } from 'react';
import {
  formatCellNumber,
  NEGATIVE_NUMBER_COLOR,
  type NumberDisplayFormat,
} from '../../utils/numberFormat';
import type { CustomTableGridRow } from '../../utils/stylingUtils';

interface FormulaCellProps {
  row: Row<CustomTableGridRow>;
  column: Column<CustomTableGridRow>;
  style?: CSSProperties;
  /** Показываем в подсказке, чтобы было видно, откуда взялось число. */
  expression?: string;
  /** Формула, считающая деньги, показывается с валютой. */
  currency?: string;
  precision?: number;
  format?: NumberDisplayFormat;
}

/**
 * Значение считает сервер, поэтому ячейка только для чтения: редактировать
 * результат формулы бессмысленно — он всё равно пересчитается.
 */
export function FormulaCell({
  row,
  column,
  style,
  expression,
  currency,
  precision,
  format,
}: FormulaCellProps) {
  const raw = row.original.data[column.id];
  const display =
    typeof raw === 'number' ? formatCellNumber(raw, { currency, precision, format }) : '—';
  const color =
    raw === null || raw === undefined
      ? 'var(--muted-foreground)'
      : typeof raw === 'number' && raw < 0 && !style?.color
        ? NEGATIVE_NUMBER_COLOR
        : undefined;

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
        ...style,
        ...(color ? { color } : {}),
      }}
    >
      {display}
    </div>
  );
}
