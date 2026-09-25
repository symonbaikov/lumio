'use client';

import { hexToRgba } from '../../utils/colorUtils';
import type { SelectOptionDef } from '../../utils/stylingUtils';

interface OptionChipProps {
  option: SelectOptionDef;
  size?: 'sm' | 'md';
}

/** Пилюля статуса: подложка — цвет опции с прозрачностью, текст — сам цвет. */
export function OptionChip({ option, size = 'md' }: OptionChipProps): React.JSX.Element {
  const color = option.color;
  return (
    <span
      data-option-value={option.value}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        maxWidth: '100%',
        padding: size === 'sm' ? '1px 6px' : '2px 8px',
        borderRadius: 999,
        fontSize: size === 'sm' ? 12 : 13,
        fontWeight: 500,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        backgroundColor: color ? hexToRgba(color, 0.18) : 'var(--muted)',
        color: color ?? 'inherit',
      }}
    >
      {option.label ?? option.value}
    </span>
  );
}
