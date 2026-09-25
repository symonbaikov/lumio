'use client';

import { Box, Typography } from '@mui/material';
import React from 'react';
import CustomDatePicker from '@/app/components/CustomDatePicker';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Select } from '@/app/components/ui/select';
import { formatValue } from '../helpers/rowDrawerHelpers';
import { parseLocalizedNumber } from '../utils/numberFormat';
import { findOption } from '../utils/selectOptions';
import type {
  CustomTableColumn,
  CustomTableRowPatch,
  SelectOptionDef,
} from '../utils/stylingUtils';
import { OptionChip } from './cells/OptionChip';

const INPUT_SX: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--border-color)',
  padding: '8px 12px',
  fontSize: 14,
  marginTop: 8,
  boxSizing: 'border-box',
};

interface FieldEditorProps {
  col: CustomTableColumn;
  value: unknown;
  options: SelectOptionDef[];
  mode: 'view' | 'edit';
  onDraftChange: (updater: (prev: CustomTableRowPatch) => CustomTableRowPatch) => void;
}

function BooleanEditor({
  col,
  value,
  onDraftChange,
}: Omit<FieldEditorProps, 'options' | 'mode'>): React.JSX.Element {
  return (
    <Box sx={{ mt: 1.5, display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      <Checkbox
        checked={Boolean(value)}
        onCheckedChange={checked => onDraftChange(prev => ({ ...prev, [col.key]: checked }))}
        className="h-5 w-5"
      />
      <Typography style={{ fontSize: 14, color: 'var(--foreground)' }}>
        {value ? 'Yes' : 'No'}
      </Typography>
    </Box>
  );
}

/**
 * Числовое поле, принимающее «1 234,56»: набранный текст живёт в поле, в
 * черновик уходит уже разобранное число (или null для пустого/мусора).
 */
export function NumberDraftInput({
  value,
  onChange,
  style,
}: {
  value: unknown;
  onChange: (next: number | null) => void;
  style?: React.CSSProperties;
}): React.JSX.Element {
  const [text, setText] = React.useState(
    value === null || value === undefined ? '' : String(value),
  );
  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={e => {
        setText(e.target.value);
        onChange(e.target.value.trim() === '' ? null : parseLocalizedNumber(e.target.value));
      }}
      style={style}
    />
  );
}

function NumberEditor({
  col,
  value,
  onDraftChange,
}: Omit<FieldEditorProps, 'options' | 'mode'>): React.JSX.Element {
  return (
    <NumberDraftInput
      value={value}
      onChange={next => onDraftChange(prev => ({ ...prev, [col.key]: next }))}
      style={INPUT_SX}
    />
  );
}

function DateEditor({
  col,
  value,
  onDraftChange,
}: Omit<FieldEditorProps, 'options' | 'mode'>): React.JSX.Element {
  return (
    <CustomDatePicker
      value={value ? String(value) : null}
      onChange={date => onDraftChange(prev => ({ ...prev, [col.key]: date || null }))}
    />
  );
}

function SelectEditor({
  col,
  value,
  options,
  onDraftChange,
}: Omit<FieldEditorProps, 'mode'>): React.JSX.Element {
  return (
    <Select
      fullWidth
      value={String(value ?? '')}
      onChange={next => onDraftChange(prev => ({ ...prev, [col.key]: next }))}
      options={[
        { value: '', label: '—' },
        ...options.map(opt => ({ value: opt.value, label: <OptionChip option={opt} /> })),
      ]}
      sx={{ mt: 1 }}
    />
  );
}

interface MultiSelectOptionProps {
  opt: SelectOptionDef;
  value: unknown;
  colKey: string;
  onDraftChange: (updater: (prev: CustomTableRowPatch) => CustomTableRowPatch) => void;
}

function MultiSelectOption({
  opt,
  value,
  colKey,
  onDraftChange,
}: MultiSelectOptionProps): React.JSX.Element {
  const selected = Array.isArray(value) && value.includes(opt.value);
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      <Checkbox
        checked={selected}
        onCheckedChange={checked => {
          const next = Array.isArray(value) ? [...value] : [];
          const updated = checked
            ? Array.from(new Set([...next, opt.value]))
            : next.filter(v => v !== opt.value);
          onDraftChange(prev => ({ ...prev, [colKey]: updated }));
        }}
        className="h-5 w-5"
      />
      <OptionChip option={opt} />
    </Box>
  );
}

function MultiSelectEditor({
  col,
  value,
  options,
  onDraftChange,
}: Omit<FieldEditorProps, 'mode'>): React.JSX.Element {
  return (
    <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: '1fr', gap: 1 }}>
      {options.map(opt => (
        <MultiSelectOption
          key={opt.value}
          opt={opt}
          value={value}
          colKey={col.key}
          onDraftChange={onDraftChange}
        />
      ))}
    </Box>
  );
}

function TextEditor({
  col,
  value,
  onDraftChange,
}: Omit<FieldEditorProps, 'options' | 'mode'>): React.JSX.Element {
  return (
    <input
      type="text"
      value={value === null || value === undefined ? '' : String(value)}
      onChange={e => onDraftChange(prev => ({ ...prev, [col.key]: e.target.value }))}
      style={INPUT_SX}
    />
  );
}

type EditorProps = Omit<FieldEditorProps, 'mode'>;

const SIMPLE_EDITORS: Partial<Record<string, (props: EditorProps) => React.JSX.Element>> = {
  boolean: ({ col, value, onDraftChange }) => (
    <BooleanEditor col={col} value={value} onDraftChange={onDraftChange} />
  ),
  number: ({ col, value, onDraftChange }) => (
    <NumberEditor col={col} value={value} onDraftChange={onDraftChange} />
  ),
  currency: ({ col, value, onDraftChange }) => (
    <NumberEditor col={col} value={value} onDraftChange={onDraftChange} />
  ),
  date: ({ col, value, onDraftChange }) => (
    <DateEditor col={col} value={value} onDraftChange={onDraftChange} />
  ),
};

function FieldInput({ col, value, options, onDraftChange }: EditorProps): React.JSX.Element {
  const simple = SIMPLE_EDITORS[col.type];
  if (simple) {
    return simple({ col, value, options, onDraftChange });
  }
  if (col.type === 'select' && options.length) {
    return <SelectEditor col={col} value={value} options={options} onDraftChange={onDraftChange} />;
  }
  if (col.type === 'multi_select' && options.length) {
    return (
      <MultiSelectEditor col={col} value={value} options={options} onDraftChange={onDraftChange} />
    );
  }
  return <TextEditor col={col} value={value} onDraftChange={onDraftChange} />;
}

/** В режиме просмотра статусы показываем чипами, остальное — текстом. */
function renderViewValue(
  col: CustomTableColumn,
  value: unknown,
  options: SelectOptionDef[],
): React.ReactNode {
  const values = Array.isArray(value)
    ? value
    : value === null || value === undefined
      ? []
      : [value];
  if ((col.type === 'select' || col.type === 'multi_select') && values.length) {
    return (
      <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
        {values.map(v => (
          <OptionChip key={String(v)} option={findOption(options, v) ?? { value: String(v) }} />
        ))}
      </span>
    );
  }
  return formatValue(col.type, value, col.config);
}

export function RowDrawerFieldEditor({
  col,
  value,
  options,
  mode,
  onDraftChange,
}: FieldEditorProps): React.JSX.Element {
  return (
    <Box sx={{ border: '1px solid var(--border-color)', bgcolor: 'background.paper', p: 2 }}>
      <Typography
        style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--muted-foreground)',
        }}
      >
        {col.title || col.key}
      </Typography>

      {mode === 'view' ? (
        <Typography
          style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}
        >
          {renderViewValue(col, value, options)}
        </Typography>
      ) : (
        <FieldInput col={col} value={value} options={options} onDraftChange={onDraftChange} />
      )}
    </Box>
  );
}
