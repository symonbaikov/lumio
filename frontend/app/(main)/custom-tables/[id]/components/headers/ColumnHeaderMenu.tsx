'use client';

import { Popover } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { ArrowDown, ArrowUp, MoreHorizontal, Palette, X } from '@/app/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { COLOR_PRESETS, withFillAlpha } from '../../utils/colorPalette';
import { parseHexFromColor } from '../../utils/colorUtils';
import type { SheetStyle } from '../../utils/stylingUtils';

export interface ColumnMenuLabels {
  menu: string;
  rename: string;
  edit: string;
  headerColor: string;
  columnColor: string;
  custom: string;
  clear: string;
  pin: string;
  unpin: string;
  hide: string;
  sortAsc: string;
  sortDesc: string;
  sortClear: string;
  delete: string;
}

/** Часть стиля, которую меняет меню; null сбрасывает часть. */
export type ColumnStylePatch = { header?: SheetStyle | null; cell?: SheetStyle | null };

type StylePart = 'header' | 'cell';

interface ColumnHeaderMenuProps {
  labels: ColumnMenuLabels;
  isPinned: boolean;
  headerColor?: string;
  columnColor?: string;
  onRename: () => void;
  onEdit?: () => void;
  onSetStyle?: (patch: ColumnStylePatch) => void;
  onTogglePin?: () => void;
  onHide?: () => void;
  onSort: (direction: 'asc' | 'desc' | null) => void;
  onDelete?: () => void;
}

const CUSTOM_COLOR_SAVE_DELAY_MS = 250;

const swatchStyle = (fill: string, selected: boolean): React.CSSProperties => ({
  width: 20,
  height: 20,
  borderRadius: 4,
  background: fill,
  border: selected ? '2px solid var(--foreground)' : '1px solid var(--border-color)',
  cursor: 'pointer',
  padding: 0,
});

const iconButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  border: '1px solid var(--border-color)',
  borderRadius: 4,
  background: 'transparent',
  color: 'var(--muted-foreground)',
  cursor: 'pointer',
  padding: 0,
};

interface SwatchRowProps {
  label: string;
  current?: string;
  customLabel: string;
  clearLabel: string;
  onPick: (fill: string) => void;
  onCustom: () => void;
  onClear: () => void;
}
function SwatchRow({
  label,
  current,
  customLabel,
  clearLabel,
  onPick,
  onCustom,
  onClear,
}: SwatchRowProps): React.JSX.Element {
  return (
    <div style={{ padding: '6px 16px' }}>
      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {COLOR_PRESETS.map(preset => (
          <button
            key={preset.id}
            type="button"
            aria-label={`${label}: ${preset.id}`}
            title={preset.id}
            onClick={() => onPick(preset.fill)}
            style={swatchStyle(preset.fill, current === preset.fill)}
          />
        ))}
        <button
          type="button"
          aria-label={`${label}: ${customLabel}`}
          title={customLabel}
          onClick={onCustom}
          style={iconButtonStyle}
        >
          <Palette size={12} />
        </button>
        <button
          type="button"
          aria-label={`${label}: ${clearLabel}`}
          title={clearLabel}
          onClick={onClear}
          style={iconButtonStyle}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

export function ColumnHeaderMenu({
  labels,
  isPinned,
  headerColor,
  columnColor,
  onRename,
  onEdit,
  onSetStyle,
  onTogglePin,
  onHide,
  onSort,
  onDelete,
}: ColumnHeaderMenuProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const [customTarget, setCustomTarget] = useState<StylePart | null>(null);
  const [customValue, setCustomValue] = useState('#ff8a00');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    },
    [],
  );

  const setPart = (part: StylePart, fill: string | null): void => {
    onSetStyle?.({ [part]: fill ? { backgroundColor: fill } : null });
  };

  const openCustom = (part: StylePart): void => {
    const current = part === 'header' ? headerColor : columnColor;
    setCustomValue(parseHexFromColor(current) || '#ff8a00');
    setMenuOpen(false);
    setCustomTarget(part);
  };

  const handleCustomChange = (hex: string): void => {
    setCustomValue(hex);
    if (!customTarget) {
      return;
    }
    const part = customTarget;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      setPart(part, withFillAlpha(hex));
    }, CUSTOM_COLOR_SAVE_DELAY_MS);
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            className="ct-column-menu-trigger"
            aria-label={labels.menu}
            title={labels.menu}
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              padding: 2,
              border: 'none',
              borderRadius: 4,
              background: 'transparent',
              cursor: 'pointer',
              color: 'inherit',
              lineHeight: 0,
            }}
          >
            <MoreHorizontal size={16} />
          </button>
        </DropdownMenuTrigger>
        {/* MUI Menu не принимает фрагменты в детях, поэтому условные пункты — через null. */}
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onRename}>{labels.rename}</DropdownMenuItem>
          {onEdit ? <DropdownMenuItem onSelect={onEdit}>{labels.edit}</DropdownMenuItem> : null}
          {onSetStyle ? <DropdownMenuSeparator /> : null}
          {onSetStyle ? (
            <SwatchRow
              label={labels.headerColor}
              current={headerColor}
              customLabel={labels.custom}
              clearLabel={labels.clear}
              onPick={fill => setPart('header', fill)}
              onCustom={() => openCustom('header')}
              onClear={() => setPart('header', null)}
            />
          ) : null}
          {onSetStyle ? (
            <SwatchRow
              label={labels.columnColor}
              current={columnColor}
              customLabel={labels.custom}
              clearLabel={labels.clear}
              onPick={fill => setPart('cell', fill)}
              onCustom={() => openCustom('cell')}
              onClear={() => setPart('cell', null)}
            />
          ) : null}
          {onTogglePin || onHide ? <DropdownMenuSeparator /> : null}
          {onTogglePin ? (
            <DropdownMenuItem onSelect={onTogglePin}>
              {isPinned ? labels.unpin : labels.pin}
            </DropdownMenuItem>
          ) : null}
          {onHide ? <DropdownMenuItem onSelect={onHide}>{labels.hide}</DropdownMenuItem> : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onSort('asc')}>
            <ArrowUp size={14} style={{ marginRight: 8 }} />
            {labels.sortAsc}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onSort('desc')}>
            <ArrowDown size={14} style={{ marginRight: 8 }} />
            {labels.sortDesc}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onSort(null)}>{labels.sortClear}</DropdownMenuItem>
          {onDelete ? <DropdownMenuSeparator /> : null}
          {onDelete ? (
            <DropdownMenuItem onSelect={onDelete} style={{ color: 'var(--destructive)' }}>
              {labels.delete}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <Popover
        open={customTarget !== null}
        anchorEl={triggerRef.current}
        onClose={() => setCustomTarget(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        disableScrollLock
        slotProps={{ paper: { sx: { p: 1.5 } } }}
      >
        <HexColorPicker color={customValue} onChange={handleCustomChange} />
      </Popover>
    </>
  );
}
