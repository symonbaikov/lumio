'use client';

import { Box } from '@mui/material';
import { useState } from 'react';
import { X } from '@/app/components/icons';
import { Select } from '@/app/components/ui/select';
import { DEFAULT_COLUMN_CURRENCY, type NewColumnDraft } from '../hooks/useColumnManagement';
import { COLOR_PRESETS } from '../utils/colorPalette';
import type { ColumnType, SelectOptionDef } from '../utils/stylingUtils';
import { tx } from '../utils/tableHelpers';
import { OptionChip } from './cells/OptionChip';

export interface ColumnTypeOption {
  value: ColumnType;
  label: string;
}

interface ColumnFieldsFormProps {
  t: unknown;
  draft: NewColumnDraft;
  setDraft: React.Dispatch<React.SetStateAction<NewColumnDraft>>;
  columnTypes: ColumnTypeOption[];
  /** Таблицы того же воркспейса — цели для колонки-связи. */
  relationTargets?: Array<{ id: string; name: string }>;
  /** Enter в поле названия. */
  onSubmit: () => void;
  /** Префикс для id полей, чтобы два окна на странице не делили одни id. */
  idPrefix: string;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--foreground)',
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--border-color)',
  background: 'var(--card-bg)',
  padding: '12px 16px',
  fontSize: 14,
  color: 'var(--foreground)',
  boxSizing: 'border-box',
};

interface OptionsEditorProps {
  t: unknown;
  options: SelectOptionDef[];
  onChange: (next: SelectOptionDef[]) => void;
  idPrefix: string;
}

/** Список опций статуса: значение + цвет из пресетов + удаление. */
function OptionsEditor({ t, options, onChange, idPrefix }: OptionsEditorProps): React.JSX.Element {
  const [draftValue, setDraftValue] = useState('');

  const addOption = (): void => {
    const value = draftValue.trim();
    if (!value || options.some(option => option.value === value)) {
      return;
    }
    onChange([...options, { value }]);
    setDraftValue('');
  };

  const setColor = (index: number, color: string): void => {
    onChange(options.map((option, i) => (i === index ? { ...option, color } : option)));
  };

  return (
    <Box sx={{ gridColumn: '1 / -1' }}>
      <span style={labelStyle}>{tx(t, ['addColumn', 'optionsLabel'], 'Options')}</span>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {options.map((option, index) => (
          <Box
            key={option.value}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
          >
            <OptionChip option={option} />
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', ml: 'auto' }}>
              {COLOR_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  aria-label={`${option.value}: ${preset.id}`}
                  title={preset.id}
                  onClick={() => setColor(index, preset.base)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: preset.base,
                    border:
                      option.color === preset.base
                        ? '2px solid var(--foreground)'
                        : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
              <button
                type="button"
                aria-label={`${option.value}: ${tx(t, ['addColumn', 'removeOption'], 'Remove')}`}
                title={tx(t, ['addColumn', 'removeOption'], 'Remove')}
                onClick={() => onChange(options.filter((_, i) => i !== index))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--muted-foreground)',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                <X size={14} />
              </button>
            </Box>
          </Box>
        ))}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <input
            id={`${idPrefix}-option`}
            value={draftValue}
            placeholder={tx(t, ['addColumn', 'optionPlaceholder'], 'New option')}
            onChange={e => setDraftValue(e.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addOption();
              }
            }}
            style={{ ...inputStyle, padding: '8px 12px' }}
          />
          <button
            type="button"
            onClick={addOption}
            disabled={!draftValue.trim()}
            style={{
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--foreground)',
              padding: '8px 12px',
              fontSize: 14,
              cursor: draftValue.trim() ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
            }}
          >
            {tx(t, ['addColumn', 'addOption'], 'Add option')}
          </button>
        </Box>
      </Box>
    </Box>
  );
}

/** Поля колонки, общие для окон «новая колонка» и «изменить колонку». */
export function ColumnFieldsForm({
  t,
  draft,
  setDraft,
  columnTypes,
  relationTargets,
  onSubmit,
  idPrefix,
}: ColumnFieldsFormProps): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '4fr 2fr' },
        gap: 2,
        alignItems: 'flex-end',
      }}
    >
      <Box>
        <label style={labelStyle} htmlFor={`${idPrefix}-title`}>
          {tx(t, ['addColumn', 'titleLabel'], 'Column title')}
        </label>
        <input
          id={`${idPrefix}-title`}
          value={draft.title}
          onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (draft.title.trim()) {
                onSubmit();
              }
            }
          }}
          placeholder={tx(t, ['addColumn', 'titlePlaceholder'], '')}
          style={inputStyle}
        />
      </Box>
      <Box>
        <label style={labelStyle} htmlFor={`${idPrefix}-type`}>
          {tx(t, ['addColumn', 'typeLabel'], 'Type')}
        </label>
        <Select
          fullWidth
          id={`${idPrefix}-type`}
          value={draft.type}
          onChange={value => setDraft(prev => ({ ...prev, type: value as ColumnType }))}
          options={columnTypes.map(typeItem => ({
            value: typeItem.value,
            label: typeItem.label,
          }))}
        />
      </Box>
      {draft.type === 'currency' && (
        <Box>
          <label style={labelStyle} htmlFor={`${idPrefix}-currency`}>
            {tx(t, ['addColumn', 'currencyLabel'], 'Currency')}
          </label>
          <input
            id={`${idPrefix}-currency`}
            value={draft.currency}
            maxLength={3}
            placeholder={DEFAULT_COLUMN_CURRENCY}
            onChange={e => setDraft(prev => ({ ...prev, currency: e.target.value.toUpperCase() }))}
            style={inputStyle}
          />
        </Box>
      )}
      {draft.type === 'formula' && (
        <Box>
          <label style={labelStyle} htmlFor={`${idPrefix}-formula`}>
            {tx(t, ['addColumn', 'formulaLabel'], 'Formula')}
          </label>
          <input
            id={`${idPrefix}-formula`}
            value={draft.expression}
            placeholder="[a] * [b] + 10"
            onChange={e => setDraft(prev => ({ ...prev, expression: e.target.value }))}
            style={inputStyle}
          />
          <p style={{ marginTop: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
            {tx(
              t,
              ['addColumn', 'formulaHint'],
              'Reference columns as [key]. Supported: + - * / ( )',
            )}
          </p>
        </Box>
      )}
      {(draft.type === 'number' || draft.type === 'formula') && (
        <Box>
          <label style={labelStyle} htmlFor={`${idPrefix}-format`}>
            {tx(t, ['addColumn', 'formatLabel'], 'Format')}
          </label>
          <Select
            fullWidth
            id={`${idPrefix}-format`}
            value={draft.format}
            onChange={value =>
              setDraft(prev => ({ ...prev, format: value === 'percent' ? 'percent' : 'plain' }))
            }
            options={[
              { value: 'plain', label: tx(t, ['addColumn', 'formatPlain'], 'Number') },
              { value: 'percent', label: tx(t, ['addColumn', 'formatPercent'], 'Percent') },
            ]}
          />
        </Box>
      )}
      {(draft.type === 'number' || draft.type === 'currency' || draft.type === 'formula') && (
        <Box>
          <label style={labelStyle} htmlFor={`${idPrefix}-precision`}>
            {tx(t, ['addColumn', 'precisionLabel'], 'Decimal places')}
          </label>
          <input
            id={`${idPrefix}-precision`}
            type="number"
            min={0}
            max={6}
            step={1}
            value={draft.precision}
            placeholder={draft.type === 'currency' ? '2' : ''}
            onChange={e => setDraft(prev => ({ ...prev, precision: e.target.value }))}
            style={inputStyle}
          />
        </Box>
      )}
      {(draft.type === 'select' || draft.type === 'multi_select') && (
        <OptionsEditor
          t={t}
          options={draft.options}
          onChange={next => setDraft(prev => ({ ...prev, options: next }))}
          idPrefix={idPrefix}
        />
      )}
      {draft.type === 'relation' && (
        <Box>
          <label style={labelStyle} htmlFor={`${idPrefix}-target`}>
            {tx(t, ['addColumn', 'targetTableLabel'], 'Target table')}
          </label>
          <Select
            fullWidth
            id={`${idPrefix}-target`}
            value={draft.targetTableId}
            onChange={value => setDraft(prev => ({ ...prev, targetTableId: value }))}
            options={[
              { value: '', label: '—' },
              ...(relationTargets ?? []).map(target => ({
                value: target.id,
                label: target.name,
              })),
            ]}
          />
        </Box>
      )}
      {draft.type === 'ai' && (
        <Box sx={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle} htmlFor={`${idPrefix}-prompt`}>
            {tx(t, ['addColumn', 'promptLabel'], 'Instruction for the model')}
          </label>
          <textarea
            id={`${idPrefix}-prompt`}
            value={draft.prompt}
            rows={2}
            placeholder={tx(
              t,
              ['addColumn', 'promptPlaceholder'],
              'For example: determine the expense category',
            )}
            onChange={e => setDraft(prev => ({ ...prev, prompt: e.target.value }))}
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
          />
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', gridColumn: '1 / -1' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={draft.isRequired}
            onChange={e => setDraft(prev => ({ ...prev, isRequired: e.target.checked }))}
          />
          {tx(t, ['addColumn', 'requiredLabel'], 'Required')}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={draft.isUnique}
            onChange={e => setDraft(prev => ({ ...prev, isUnique: e.target.checked }))}
          />
          {tx(t, ['addColumn', 'uniqueLabel'], 'Unique')}
        </label>
      </Box>
    </Box>
  );
}
