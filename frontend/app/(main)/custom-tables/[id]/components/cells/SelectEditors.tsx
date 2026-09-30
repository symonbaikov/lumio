'use client';

import { Menu, MenuItem } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Check } from '@/app/components/icons';
import { Checkbox } from '@/app/components/ui/checkbox';
import type { SelectOptionDef } from '../../utils/types';

const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '').slice(0, 6);
  const n = Number.parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
  if (Number.isNaN(n)) {
    return `rgba(107, 114, 128, ${alpha})`;
  }
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/** Status pill: option colour at low alpha behind text in the colour itself. */
export function OptionChip({ option }: { option: SelectOptionDef }) {
  const style = option.color
    ? { backgroundColor: hexToRgba(option.color, 0.16), color: option.color }
    : undefined;
  return (
    <span className="lumio-ct__chip" style={style} data-option-value={option.value}>
      {option.label ?? option.value}
    </span>
  );
}

interface EditorProps {
  options: SelectOptionDef[];
  onClose: () => void;
}

/** Anchors a MUI menu to the cell that opened it. */
function useCellAnchor() {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const cell = anchorRef.current?.closest('td');
    setAnchor(cell instanceof HTMLElement ? cell : anchorRef.current);
  }, []);
  return { anchorRef, anchor };
}

export function SelectEditor({
  options,
  value,
  clearLabel,
  onChange,
  onClose,
}: EditorProps & {
  value: string | null;
  clearLabel: string;
  onChange: (next: string | null) => void;
}) {
  const { anchorRef, anchor } = useCellAnchor();
  const pick = (next: string | null) => {
    if (next !== value) {
      onChange(next);
    }
    onClose();
  };
  return (
    <span ref={anchorRef} className="lumio-ct__cell">
      <Menu open={Boolean(anchor)} anchorEl={anchor} onClose={onClose}>
        {options.map(option => (
          <MenuItem
            key={option.value}
            selected={option.value === value}
            onClick={() => pick(option.value)}
          >
            <OptionChip option={option} />
          </MenuItem>
        ))}
        {value ? <MenuItem onClick={() => pick(null)}>{clearLabel}</MenuItem> : null}
      </Menu>
    </span>
  );
}

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

export function MultiSelectEditor({
  options,
  value,
  onChange,
  onClose,
}: EditorProps & { value: string[]; onChange: (next: string[]) => void }) {
  const { anchorRef, anchor } = useCellAnchor();
  const [selected, setSelected] = useState<string[]>(value);
  const commit = () => {
    if (!sameList(selected, value)) {
      onChange(selected);
    }
    onClose();
  };
  const toggle = (optionValue: string) =>
    setSelected(prev =>
      prev.includes(optionValue) ? prev.filter(v => v !== optionValue) : [...prev, optionValue],
    );
  return (
    <span ref={anchorRef} className="lumio-ct__cell">
      <Menu open={Boolean(anchor)} anchorEl={anchor} onClose={commit}>
        {options.map(option => (
          <MenuItem key={option.value} onClick={() => toggle(option.value)}>
            <Checkbox
              checked={selected.includes(option.value)}
              aria-label={option.label ?? option.value}
            />
            <OptionChip option={option} />
            {selected.includes(option.value) ? <Check size={14} aria-hidden /> : null}
          </MenuItem>
        ))}
      </Menu>
    </span>
  );
}
