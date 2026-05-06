'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { Box, Typography } from '@mui/material';
import type { CSSProperties } from 'react';
import { sheetStyleToCss } from './sheetStyleUtils';
import type { ColumnType, PreviewColumn, PreviewResponse } from './types';
import { useTheme } from 'next-themes';
import { tokens } from '@/lib/theme-tokens';

// cellInputStyle and cellSelectStyle are computed per-component (need theme tokens)

type T = {
  preview: {
    title: string; subtitle: string; rowHeader: string;
    layoutPrefix: { value: string }; hint: React.ReactNode;
  };
  columns: {
    title: string; subtitle: string; enableAll: string; appearAfterPreview: React.ReactNode;
    tableHeaders: { enabled: string; name: string; type: string };
    types: { text: string; number: string; date: string; boolean: string; select: string; multiSelect: string };
  };
};

type PreviewRowCellProps = { value: string | null; rowNumber: number; idx: number; styles?: Array<import('./sheetStyleUtils').SheetCellStyle | null> };
const PreviewRowCell = ({ value, rowNumber, idx, styles }: PreviewRowCellProps): React.JSX.Element => {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  const style = styles?.[idx] || null;
  const css = sheetStyleToCss(style || {});
  const { color: cssColor, ...cssRest } = css;
  const tdStyle: CSSProperties = { padding: '4px 8px', color: cssColor ?? c.ink800, ...cssRest };
  return <td key={`${rowNumber}-${idx}`} style={tdStyle}>{value ?? '—'}</td>;
};

type PreviewSampleRow = PreviewResponse['sampleRows'][number];
type SampleTableRowProps = { row: PreviewSampleRow; hasExtra: boolean };
const SampleTableRow = ({ row, hasExtra }: SampleTableRowProps): React.JSX.Element => {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  return (
    <tr style={{ borderBottom: `1px solid ${c.ink50}` }}>
      <td style={{ padding: '4px 8px', color: c.ink500 }}>{row.rowNumber}</td>
      {Array.from(row.values.slice(0, 12).entries()).map(([idx, v]) => {
        const k = `${row.rowNumber}-${idx}`;
        return <PreviewRowCell key={k} value={v} rowNumber={row.rowNumber} idx={idx} styles={row.styles} />;
      })}
      {hasExtra && <td style={{ padding: '4px 8px', color: c.ink500 }}>…</td>}
    </tr>
  );
};

type DataTableProps = { preview: PreviewResponse; t: T };
const DataTable = ({ preview, t }: DataTableProps): React.JSX.Element => {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  const hasExtra = preview.columns.length > 12;
  return (
    <Box sx={{ mt: 2, overflowX: 'auto' }}>
      <table style={{ minWidth: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${c.ink150}` }}>
            <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: c.ink800 }}>{t.preview.rowHeader}</th>
            {preview.columns.slice(0, 12).map(col => (
              <th key={col.index} style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: c.ink800 }}>{col.title}</th>
            ))}
            {hasExtra && <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: c.ink500 }}>…</th>}
          </tr>
        </thead>
        <tbody>
          {preview.sampleRows.map(r => <SampleTableRow key={r.rowNumber} row={r} hasExtra={hasExtra} />)}
        </tbody>
      </table>
    </Box>
  );
};

export type PreviewPanelProps = { preview: PreviewResponse | null; t: Record<string, unknown> };
export const PreviewPanel = ({ preview, t: tRaw }: PreviewPanelProps): React.JSX.Element => {
  const t = tRaw as unknown as T;
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  return (
    <Box sx={{ border: `1px solid ${c.ink150}`, bgcolor: 'background.paper', p: 2 }} data-tour-id="gs-import-preview-panel">
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
        <Box>
          <Typography style={{ fontSize: 14, fontWeight: 600, color: c.ink900 }}>{t.preview.title}</Typography>
          <Typography style={{ fontSize: 12, color: c.ink500, marginTop: 4 }}>{t.preview.subtitle}</Typography>
        </Box>
        {preview && (
          <Box style={{ fontSize: 12, color: c.ink500, textAlign: 'right' }}>
            <div>{preview.usedRange.a1}</div>
            <div>{preview.usedRange.rowsCount}×{preview.usedRange.colsCount}, {t.preview.layoutPrefix.value}: {preview.layoutSuggested}</div>
          </Box>
        )}
      </Box>
      {!preview
        ? <Box sx={{ mt: 2, border: `1px dashed ${c.ink150}`, bgcolor: c.ink50, p: 3, fontSize: 14, color: c.ink700 }}>{t.preview.hint}</Box>
        : <DataTable preview={preview} t={t} />}
    </Box>
  );
};

type UpdateArgs = { index: number; patch: Partial<PreviewColumn> };
type UpdateColumnFn = ({ index, patch }: UpdateArgs) => void;

type ColumnRowProps = { col: PreviewColumn; isLast: boolean; onUpdate: UpdateColumnFn; t: T };
const ColumnRow = ({ col, isLast, onUpdate, t }: ColumnRowProps): React.JSX.Element => {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  const cellInputStyle: CSSProperties = {
    width: '100%', border: `1px solid ${c.ink150}`, background: 'var(--card-bg)',
    padding: '8px 12px', fontSize: 14, boxSizing: 'border-box',
  };
  const cellSelectStyle: CSSProperties = {
    width: '100%', border: `1px solid ${c.ink150}`, background: 'var(--card-bg)',
    padding: '8px 12px', fontSize: 14,
  };
  return (
    <tr style={{ borderBottom: isLast ? 'none' : `1px solid ${c.ink50}` }}>
      <td style={{ padding: '8px 12px' }}>
        <Checkbox checked={col.include} onCheckedChange={checked => onUpdate({ index: col.index, patch: { include: checked as boolean } })} className="h-5 w-5" />
      </td>
      <td style={{ padding: '8px 12px', color: c.ink500 }}>{col.a1}</td>
      <td style={{ padding: '8px 12px' }}>
        <input value={col.title} onChange={e => onUpdate({ index: col.index, patch: { title: e.target.value } })} style={cellInputStyle} />
      </td>
      <td style={{ padding: '8px 12px' }}>
        <select value={col.suggestedType} onChange={e => onUpdate({ index: col.index, patch: { suggestedType: e.target.value as ColumnType } })} style={cellSelectStyle}>
          <option value="text">{t.columns.types.text}</option>
          <option value="number">{t.columns.types.number}</option>
          <option value="date">{t.columns.types.date}</option>
          <option value="boolean">{t.columns.types.boolean}</option>
          <option value="select">{t.columns.types.select}</option>
          <option value="multi_select">{t.columns.types.multiSelect}</option>
        </select>
      </td>
    </tr>
  );
};

type ColumnsTableProps = { columns: PreviewColumn[]; setColumns: React.Dispatch<React.SetStateAction<PreviewColumn[]>>; t: T };
const ColumnsTable = ({ columns, setColumns, t }: ColumnsTableProps): React.JSX.Element => {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  const updateColumn: UpdateColumnFn = ({ index, patch }) => {
    setColumns(prev => prev.map(x => (x.index === index ? { ...x, ...patch } : x)));
  };
  const lastIdx = columns.length - 1;
  return (
    <Box sx={{ mt: 2, overflowX: 'auto' }}>
      <table style={{ minWidth: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
        <thead style={{ background: c.ink50, borderBottom: `1px solid ${c.ink150}` }}>
          <tr>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: c.ink800, width: 84 }}>{t.columns.tableHeaders.enabled}</th>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: c.ink800, width: 80 }}>A1</th>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: c.ink800 }}>{t.columns.tableHeaders.name}</th>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: c.ink800, width: 180 }}>{t.columns.tableHeaders.type}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(columns.entries()).map(([idx, c]) => <ColumnRow key={c.index} col={c} isLast={idx === lastIdx} onUpdate={updateColumn} t={t} />)}
        </tbody>
      </table>
    </Box>
  );
};

export type ColumnsPanelProps = {
  preview: PreviewResponse | null;
  columns: PreviewColumn[];
  setColumns: React.Dispatch<React.SetStateAction<PreviewColumn[]>>;
  t: Record<string, unknown>;
};
export const ColumnsPanel = ({ preview, columns, setColumns, t: tRaw }: ColumnsPanelProps): React.JSX.Element => {
  const t = tRaw as unknown as T;
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  return (
    <Box sx={{ border: `1px solid ${c.ink150}`, bgcolor: 'background.paper', p: 2 }} data-tour-id="gs-import-columns-panel">
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
        <Box>
          <Typography style={{ fontSize: 14, fontWeight: 600, color: c.ink900 }}>{t.columns.title}</Typography>
          <Typography style={{ fontSize: 12, color: c.ink500, marginTop: 4 }}>{t.columns.subtitle}</Typography>
        </Box>
        {preview && (
          <Box component="button" onClick={() => setColumns(prev => prev.map(col => ({ ...col, include: true })))}
            data-tour-id="gs-import-enable-all"
            sx={{ fontSize: 12, color: 'primary.main', border: 'none', bgcolor: 'transparent', cursor: 'pointer', '&:hover': { color: 'primary.dark' } }}
          >
            {t.columns.enableAll}
          </Box>
        )}
      </Box>
      {!preview
        ? <Box sx={{ mt: 2, border: `1px dashed ${c.ink150}`, bgcolor: c.ink50, p: 3, fontSize: 14, color: c.ink700 }}>{t.columns.appearAfterPreview}</Box>
        : <ColumnsTable columns={columns} setColumns={setColumns} t={t} />}
    </Box>
  );
};
