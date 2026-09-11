// Re-exports for backward compatibility

export {
  buildColumnMaps,
  buildMappedColumns,
  inferFieldFromColumn,
  inferNewColumnType,
  tryMapByHeaderMatch,
  tryMapByValueInference,
} from './pasteMappingBuilder';
export {
  matchFieldByName,
  normalizeToken,
  parseClipboardRows,
  parseCurrencyCell,
  parseDateCell,
  parseNumberCell,
  parsePaidCell,
  resolveCurrencyCode,
  splitDelimitedRow,
} from './pasteParser';
export { buildRowData } from './pasteRowBuilder';
export type {
  PasteColumn,
  PasteColumnMapping,
  PasteErrorKey,
  PasteFieldKey,
  PasteMappingSelection,
  PastePreviewCell,
  PastePreviewData,
  PastePreviewRow,
  PasteSourceColumn,
} from './pasteTypes';
export { PASTE_FIELD_ALIASES } from './pasteTypes';

// ---------------------------------------------------------------------------
// Imports used in this file
// ---------------------------------------------------------------------------

import {
  buildColumnMaps,
  buildMappedColumns,
  inferNewColumnType,
  tryMapByHeaderMatch,
  tryMapByValueInference,
} from './pasteMappingBuilder';
import {
  matchFieldByName,
  normalizeToken,
  parseCurrencyCell,
  parseDateCell,
  parseNumberCell,
  parsePaidCell,
} from './pasteParser';
import { buildRowData } from './pasteRowBuilder';
import type {
  PasteColumn,
  PasteErrorKey,
  PasteFieldKey,
  PasteMappingSelection,
  PastePreviewData,
  PasteSourceColumn,
} from './pasteTypes';
import type { CustomTableRowPatch } from './stylingUtils';

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

export const isEditableTarget = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  if (!element) {
    return false;
  }
  if (element.closest("input, textarea, select, [contenteditable='true']")) {
    return true;
  }
  return Boolean(element.getAttribute('contenteditable') === 'true');
};

export const isAbortError = (error: unknown): boolean => {
  const candidate = error as { name?: string; code?: string } | null;
  return (
    candidate?.name === 'CanceledError' ||
    candidate?.name === 'AbortError' ||
    candidate?.code === 'ERR_CANCELED'
  );
};

// ---------------------------------------------------------------------------
// Header detection
// ---------------------------------------------------------------------------

const isHeaderCell = (cell: string, fieldByColumnName: Map<string, PasteFieldKey>): boolean => {
  const normalized = normalizeToken(cell || '');
  if (!normalized) {
    return false;
  }
  return fieldByColumnName.has(normalized) || Boolean(matchFieldByName(normalized));
};

export const detectHeaderRow = (
  rows: string[][],
  fieldByColumnName: Map<string, PasteFieldKey>,
): boolean => {
  if (!rows.length) {
    return false;
  }
  const cells = (rows[0] || []).map(c => normalizeToken(c || '')).filter(Boolean);
  if (!cells.length) {
    return false;
  }
  const hits = cells.filter(c => isHeaderCell(c, fieldByColumnName)).length;
  return hits >= Math.max(1, Math.ceil(cells.length / 2));
};

// ---------------------------------------------------------------------------
// Value inference
// ---------------------------------------------------------------------------

const inferScores = (sample: string[]): Record<string, number> => ({
  date: sample.reduce((acc, v) => acc + (parseDateCell(v).error ? 0 : 1), 0),
  amount: sample.reduce((acc, v) => acc + (parseNumberCell(v).error ? 0 : 1), 0),
  currency: sample.reduce((acc, v) => acc + (parseCurrencyCell(v).error ? 0 : 1), 0),
  paid: sample.reduce((acc, v) => acc + (parsePaidCell(v).error ? 0 : 1), 0),
});

export const inferFieldFromValues = (values: string[]): PasteFieldKey | null => {
  const sample = values
    .map(v => v.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (!sample.length) {
    return null;
  }
  const scores = inferScores(sample);
  const entries = Object.entries(scores) as Array<[PasteFieldKey, number]>;
  entries.sort((a, b) => b[1] - a[1]);
  const [bestField, bestScore] = entries[0] || [];
  if (!bestField) {
    return null;
  }
  if (bestScore / sample.length < 0.6) {
    return null;
  }
  return bestField;
};

// ---------------------------------------------------------------------------
// Source column builder
// ---------------------------------------------------------------------------

export const buildSourceColumns = (
  rawRows: string[][],
  useHeaders: boolean,
): { columns: PasteSourceColumn[]; dataRows: string[][] } => {
  const headerRow = useHeaders ? rawRows[0] || [] : [];
  const dataRows = useHeaders ? rawRows.slice(1) : rawRows;
  const maxLen = Math.max(headerRow.length, ...dataRows.map(row => row.length), 0);
  const columns: PasteSourceColumn[] = [];
  for (let index = 0; index < maxLen; index += 1) {
    const header = String(headerRow[index] ?? '').trim();
    const sampleValues = dataRows
      .slice(0, 20)
      .map(row => String(row[index] ?? ''))
      .filter(value => value.trim() !== '');
    columns.push({ index, header, sampleValues });
  }
  return { columns, dataRows };
};

// ---------------------------------------------------------------------------
// Auto-mapping builder
// ---------------------------------------------------------------------------

type AutoMappingArgs = {
  sourceColumns: PasteSourceColumn[];
  maps: ReturnType<typeof buildColumnMaps>;
  useHeaders: boolean;
  defaults: Record<PasteFieldKey | 'columnPrefix', string>;
};

const mapSourceColumn = (
  sourceColumn: PasteSourceColumn,
  ctx: Parameters<typeof tryMapByHeaderMatch>[1],
  defaults: Record<PasteFieldKey | 'columnPrefix', string>,
  // eslint-disable-next-line complexity
): PasteMappingSelection => {
  const { index, header, sampleValues } = sourceColumn;
  if (!(header || sampleValues.length)) {
    return { mode: 'ignore' };
  }
  const headerResult = tryMapByHeaderMatch(sourceColumn, ctx);
  if (headerResult) {
    return headerResult;
  }
  const valueResult = tryMapByValueInference(sourceColumn, inferFieldFromValues(sampleValues), ctx);
  if (valueResult) {
    return valueResult;
  }
  const field = matchFieldByName(header) ?? null;
  return {
    mode: 'new',
    field,
    newTitle: header || `${defaults.columnPrefix} ${index + 1}`,
    newType: inferNewColumnType(field),
  };
};

const buildAutoMapping = ({
  sourceColumns,
  maps,
  useHeaders,
  defaults,
}: AutoMappingArgs): Record<number, PasteMappingSelection> => {
  const usedExisting = new Set<string>();
  const ctx = {
    useHeaders,
    columnNameMap: maps.columnNameMap,
    fieldToColumn: maps.fieldToColumn,
    defaults,
    usedExisting,
  };
  const mapping: Record<number, PasteMappingSelection> = {};
  for (const sc of sourceColumns) {
    mapping[sc.index] = mapSourceColumn(sc, ctx, defaults);
  }
  return mapping;
};

// ---------------------------------------------------------------------------
// Row data builder
// ---------------------------------------------------------------------------

type DataPayloadArgs = {
  dataRows: string[][];
  mappedColumns: ReturnType<typeof buildMappedColumns>;
  edits: Record<string, string>;
};

type DataPayloadResult = {
  dataPayload: CustomTableRowPatch[];
  previewRows: PastePreviewData['previewRows'];
  errors: Record<PasteErrorKey, number>;
  hasErrors: boolean;
};

const buildDataPayload = ({
  dataRows,
  mappedColumns,
  edits,
}: DataPayloadArgs): DataPayloadResult => {
  const dataPayload: CustomTableRowPatch[] = [];
  const previewRows: PastePreviewData['previewRows'] = [];
  const errors: Record<PasteErrorKey, number> = { date: 0, amount: 0, currency: 0, paid: 0 };
  let hasErrors = false;

  dataRows.forEach((row, rowIndex) => {
    if (!row || row.every(cell => !String(cell ?? '').trim())) {
      return;
    }
    const result = buildRowData({ row, rowIndex, mappedColumns, edits });
    for (const key of Object.keys(result.errors) as PasteErrorKey[]) {
      errors[key] += result.errors[key];
    }
    if (result.hasError) {
      hasErrors = true;
    }
    dataPayload.push(result.rowData);
    if (previewRows.length < 50) {
      previewRows.push({ id: rowIndex, rowIndex, cells: result.cells });
    }
  });

  return { dataPayload, previewRows, errors, hasErrors };
};

// ---------------------------------------------------------------------------
// Main paste preview builder
// ---------------------------------------------------------------------------

export type BuildPastePreviewArgs = {
  rawRows: string[][];
  useHeaders: boolean;
  orderedColumns: PasteColumn[];
  mappingSelection: Record<number, PasteMappingSelection> | null;
  edits: Record<string, string>;
  defaults: Record<PasteFieldKey | 'columnPrefix', string>;
};

type PreviewResult = {
  preview: PastePreviewData;
  mapping: Record<number, PasteMappingSelection>;
  sourceColumns: PasteSourceColumn[];
};

type EmptyPreviewArgs = {
  headersDetected: boolean;
  hasHeadersToggle: boolean;
  mapping: Record<number, PasteMappingSelection>;
  sourceColumns: PasteSourceColumn[];
};
const makeEmptyPreview = ({
  headersDetected,
  hasHeadersToggle,
  mapping,
  sourceColumns,
}: EmptyPreviewArgs): PreviewResult => ({
  preview: {
    totalRows: 0,
    previewRows: [],
    dataRows: [],
    columns: [],
    errors: { date: 0, amount: 0, currency: 0, paid: 0 },
    hasErrors: false,
    extraRowsCount: 0,
    hasHeadersToggle,
    headersDetected,
  },
  mapping,
  sourceColumns,
});

export const buildPastePreview = ({
  rawRows,
  useHeaders,
  orderedColumns,
  mappingSelection,
  edits,
  defaults,
}: BuildPastePreviewArgs): PreviewResult => {
  const maps = buildColumnMaps(orderedColumns);
  const headersDetected = detectHeaderRow(rawRows, maps.columnNameToField);
  const hasHeadersToggle = headersDetected || rawRows.length > 1;
  const { columns: sourceColumns, dataRows } = buildSourceColumns(rawRows, useHeaders);
  const mapping =
    mappingSelection ?? buildAutoMapping({ sourceColumns, maps, useHeaders, defaults });
  const mappedColumns = buildMappedColumns({
    sourceColumns,
    mapping,
    columnByKey: maps.columnByKey,
    defaults,
  });

  if (!mappedColumns.length) {
    return makeEmptyPreview({ headersDetected, hasHeadersToggle, mapping, sourceColumns });
  }

  const { dataPayload, previewRows, errors, hasErrors } = buildDataPayload({
    dataRows,
    mappedColumns,
    edits,
  });
  const totalRows = dataPayload.length;
  return {
    preview: {
      totalRows,
      previewRows,
      dataRows: dataPayload,
      columns: mappedColumns,
      errors,
      hasErrors,
      extraRowsCount: totalRows > 50 ? totalRows - 50 : 0,
      hasHeadersToggle,
      headersDetected,
    },
    mapping,
    sourceColumns,
  };
};
