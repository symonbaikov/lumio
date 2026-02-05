'use client';

import ConfirmModal from '@/app/components/ConfirmModal';
import { ModalFooter, ModalShell } from '@/app/components/ui/modal-shell';
import { useAuth } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import { format } from 'date-fns';
import { enUS, kk, ru } from 'date-fns/locale';
import {
  CheckCircle,
  Loader2,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import 'react-day-picker/style.css';
import { useIntlayer, useLocale } from 'next-intlayer';
import { CustomTableTanStack } from './CustomTableTanStack';
import { RowDrawer } from './components/RowDrawer';
import type { CustomTableGridRow } from './utils/stylingUtils';

type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multi_select';
type EditingScope = 'name' | 'description' | 'both';

interface CustomTableColumn {
  id: string;
  key: string;
  title: string;
  type: ColumnType;
  isRequired: boolean;
  isUnique: boolean;
  position: number;
  config: Record<string, any> | null;
  style?: {
    header?: Record<string, any>;
    cell?: Record<string, any>;
  } | null;
}

interface CustomTable {
  id: string;
  name: string;
  description: string | null;
  source: string;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
    color?: string | null;
    icon?: string | null;
  } | null;
  columns: CustomTableColumn[];
  viewSettings?: Record<string, any> | null;
}

interface CustomTableRow {
  id: string;
  rowNumber: number;
  data: Record<string, any>;
  styles?: Record<string, any> | null;
}

type RowFilterOp =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'startsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'search';

type RowFilter = { col: string; op: RowFilterOp; value?: any };

type QuickTab = {
  id: string;
  label: string;
  filter?: RowFilter;
  count?: number;
};

const normalizeBooleanValue = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  const raw =
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : String(value ?? '')
          .trim()
          .toLowerCase();
  if (['true', '1', 'yes', 'y', 't'].includes(raw)) return true;
  if (['false', '0', 'no', 'n', 'f'].includes(raw)) return false;
  return Boolean(value);
};

const rowMatchesFilter = (row: CustomTableRow, filter: RowFilter | null) => {
  if (!filter) return true;
  const value = row.data?.[filter.col];

  switch (filter.op) {
    case 'eq': {
      if (typeof filter.value === 'boolean') {
        if (value === null || value === undefined || value === '') return false;
        return normalizeBooleanValue(value) === filter.value;
      }
      return String(value ?? '') === String(filter.value ?? '');
    }
    case 'in': {
      if (!Array.isArray(filter.value)) return false;
      if (Array.isArray(value)) {
        return value.some(v => filter.value.includes(String(v)));
      }
      return filter.value.includes(String(value));
    }
    default:
      return true;
  }
};

type PasteFieldKey = 'date' | 'type' | 'amount' | 'currency' | 'comment' | 'paid';

type PasteErrorKey = 'date' | 'amount' | 'currency' | 'paid';

type PasteColumnMapping = {
  sourceIndex: number | null;
  field: PasteFieldKey;
  columnKey: string | null;
  label: string;
  options?: string[];
  mode: 'existing' | 'new';
  newTitle?: string;
  newType?: ColumnType;
};

type PasteSourceColumn = {
  index: number;
  header: string;
  sampleValues: string[];
};

type PasteMappingSelection = {
  mode: 'ignore' | 'existing' | 'new';
  columnKey?: string;
  field?: PasteFieldKey | null;
  newTitle?: string;
  newType?: ColumnType;
};

type PastePreviewCell = {
  value: string;
  error: boolean;
  sourceIndex: number | null;
};

type PastePreviewRow = {
  id: number;
  rowIndex: number;
  cells: PastePreviewCell[];
};

type PastePreviewData = {
  totalRows: number;
  previewRows: PastePreviewRow[];
  dataRows: Array<Record<string, any>>;
  columns: PasteColumnMapping[];
  errors: Record<PasteErrorKey, number>;
  hasErrors: boolean;
  extraRowsCount: number;
  hasHeadersToggle: boolean;
  headersDetected: boolean;
};

const PASTE_FIELD_ALIASES: Record<PasteFieldKey, string[]> = {
  date: ['date', 'дата', 'день', 'day', 'dt', 'дт'],
  type: ['type', 'тип', 'category', 'категория', 'вид', 'account', 'операция'],
  amount: ['amount', 'sum', 'сумма', 'итого', 'total', 'value', 'стоимость'],
  currency: ['currency', 'валюта', 'curr', 'вал', 'code'],
  comment: ['comment', 'комментар', 'note', 'memo', 'описан', 'details', 'description'],
  paid: ['paid', 'оплач', 'оплата', 'неоплач', 'payment', 'status'],
};

const normalizeToken = (value: string) =>
  value
    .toLowerCase()
    .replace(/[\s._-]+/g, '')
    .trim();

const matchFieldByName = (raw: string): PasteFieldKey | null => {
  const normalized = normalizeToken(raw);
  if (!normalized) return null;
  for (const [field, aliases] of Object.entries(PASTE_FIELD_ALIASES)) {
    for (const alias of aliases) {
      if (normalized === normalizeToken(alias)) return field as PasteFieldKey;
      if (normalized.includes(normalizeToken(alias))) return field as PasteFieldKey;
    }
  }
  return null;
};

const detectHeaderRow = (rows: string[][], fieldByColumnName: Map<string, PasteFieldKey>) => {
  if (!rows.length) return false;
  const first = rows[0] || [];
  let hits = 0;
  let checked = 0;
  for (const cell of first) {
    const normalized = normalizeToken(cell || '');
    if (!normalized) continue;
    checked += 1;
    if (fieldByColumnName.has(normalized) || matchFieldByName(normalized)) {
      hits += 1;
    }
  }
  if (!checked) return false;
  return hits >= Math.max(1, Math.ceil(checked / 2));
};

const splitDelimitedRow = (line: string, delimiter: string) => {
  if (!line) return [''];
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
};

const parseClipboardRows = (text: string) => {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  if (lines.length && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  const hasTabs = lines.some(line => line.includes('\t'));
  const delimiter = hasTabs
    ? '\t'
    : (() => {
        const commaCount = lines.reduce((acc, line) => acc + (line.match(/,/g)?.length ?? 0), 0);
        const semiCount = lines.reduce((acc, line) => acc + (line.match(/;/g)?.length ?? 0), 0);
        if (semiCount > commaCount && semiCount > 0) return ';';
        if (commaCount > 0) return ',';
        return '\t';
      })();
  const rows = lines.map(line => splitDelimitedRow(line, delimiter));
  return { rows, delimiter };
};

const parseDateCell = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: false };
  const isoMatch = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  const dmyMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  let year: number;
  let month: number;
  let day: number;
  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (dmyMatch) {
    day = Number(dmyMatch[1]);
    month = Number(dmyMatch[2]);
    year = Number(dmyMatch[3]);
  } else {
    const fallback = new Date(trimmed);
    if (Number.isNaN(fallback.getTime())) return { value: null, error: true };
    return { value: format(fallback, 'yyyy-MM-dd'), error: false };
  }
  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return { value: null, error: true };
  }
  return { value: format(parsed, 'yyyy-MM-dd'), error: false };
};

const parseNumberCell = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: false };
  const stripped = trimmed.replace(/\s/g, '');
  const separators = stripped.match(/[.,]/g) || [];
  let normalized = stripped;
  if (separators.length === 1) {
    const sepIndex = stripped.search(/[.,]/);
    const digitsAfter = stripped.length - sepIndex - 1;
    if (digitsAfter === 3) {
      normalized = stripped.replace(/[.,]/g, '');
    } else {
      normalized = stripped.replace(/[.,]/g, (match, offset) => (offset === sepIndex ? '.' : ''));
    }
  } else if (separators.length > 1) {
    const lastComma = stripped.lastIndexOf(',');
    const lastDot = stripped.lastIndexOf('.');
    const decimalPos = Math.max(lastComma, lastDot);
    normalized = stripped.replace(/[.,]/g, (match, offset) => (offset === decimalPos ? '.' : ''));
  } else {
    normalized = stripped.replace(/[.,]/g, '');
  }
  if (!/^[-+]?\d+(\.\d+)?$/.test(normalized)) {
    return { value: null, error: true };
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) return { value: null, error: true };
  return { value, error: false };
};

const CURRENCY_ALIASES: Record<string, string[]> = {
  KZT: ['kzt', 'тенге', 'теңге', 'тг', 'tg'],
  RUB: ['rub', 'руб', 'рубль', 'ruble', 'rur'],
  USD: ['usd', 'доллар', 'доллары', 'us$', 'бакс'],
  EUR: ['eur', 'евро'],
  GBP: ['gbp', 'фунт'],
  CNY: ['cny', 'юань', 'yuan', 'rmb'],
  JPY: ['jpy', 'иена', 'yen'],
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: 'USD',
  '€': 'EUR',
  '₽': 'RUB',
  '₸': 'KZT',
  '£': 'GBP',
  '¥': 'JPY',
};

const normalizeCurrencyToken = (value: string) =>
  normalizeToken(value).replace(/[^\p{L}\p{N}]/gu, '');

const resolveCurrencyCode = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (CURRENCY_SYMBOLS[trimmed]) return CURRENCY_SYMBOLS[trimmed];
  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  const normalized = normalizeCurrencyToken(trimmed);
  for (const [code, aliases] of Object.entries(CURRENCY_ALIASES)) {
    if (aliases.some(alias => normalizeCurrencyToken(alias) === normalized)) {
      return code;
    }
  }
  return null;
};

const parseCurrencyCell = (raw: string, options?: string[]) => {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: false };
  const resolved = resolveCurrencyCode(trimmed);
  if (options?.length) {
    const normalizedOptions = options.map(opt => normalizeToken(opt));
    const matchIndex = normalizedOptions.indexOf(normalizeToken(trimmed));
    if (matchIndex !== -1) {
      return { value: options[matchIndex], error: false };
    }
    if (resolved) {
      const resolvedIndex = normalizedOptions.indexOf(normalizeToken(resolved));
      if (resolvedIndex !== -1) {
        return { value: options[resolvedIndex], error: false };
      }
    }
    return { value: null, error: true };
  }
  if (resolved) return { value: resolved, error: false };
  return { value: null, error: true };
};

const parsePaidCell = (raw: string) => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return { value: null, error: false };
  const positive = ['true', '1', 'yes', 'y', 't', 'да', 'оплачено', 'paid'];
  const negative = [
    'false',
    '0',
    'no',
    'n',
    'f',
    'нет',
    'неоплачено',
    'не оплачено',
    'не оплачен',
    'unpaid',
  ];
  if (positive.includes(trimmed)) return { value: true, error: false };
  if (negative.includes(trimmed)) return { value: false, error: false };
  return { value: null, error: true };
};

const isEditableTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  if (element.closest("input, textarea, select, [contenteditable='true']")) {
    return true;
  }
  return Boolean(element.getAttribute('contenteditable') === 'true');
};

const inferFieldFromColumn = (column: CustomTableColumn): PasteFieldKey | null => {
  const matched = matchFieldByName(`${column.title ?? ''} ${column.key ?? ''}`);
  if (matched) return matched;
  if (column.type === 'date') return 'date';
  if (column.type === 'number') return 'amount';
  if (column.type === 'boolean') return 'paid';
  return null;
};

const inferFieldFromValues = (values: string[]) => {
  const sample = values
    .map(v => v.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (!sample.length) return null;
  const score = (parser: (raw: string) => { error: boolean }) =>
    sample.reduce((acc, value) => acc + (parser(value).error ? 0 : 1), 0);
  const totals = sample.length;
  const scores = {
    date: score(parseDateCell),
    amount: score(parseNumberCell),
    currency: score(value => parseCurrencyCell(value)),
    paid: score(parsePaidCell),
  };
  const entries = Object.entries(scores) as Array<[PasteFieldKey, number]>;
  entries.sort((a, b) => b[1] - a[1]);
  const [bestField, bestScore] = entries[0] || [];
  if (!bestField) return null;
  const ratio = bestScore / totals;
  if (ratio < 0.6) return null;
  return bestField;
};

const inferNewColumnType = (field: PasteFieldKey | null) => {
  if (field === 'date') return 'date';
  if (field === 'amount') return 'number';
  if (field === 'paid') return 'boolean';
  return 'text';
};

const buildSourceColumns = (rawRows: string[][], useHeaders: boolean) => {
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

const buildPastePreview = (
  rawRows: string[][],
  useHeaders: boolean,
  orderedColumns: CustomTableColumn[],
  mappingSelection: Record<number, PasteMappingSelection> | null,
  edits: Record<string, string>,
  defaults: Record<PasteFieldKey | 'columnPrefix', string>,
): {
  preview: PastePreviewData;
  mapping: Record<number, PasteMappingSelection>;
  sourceColumns: PasteSourceColumn[];
} => {
  const columnByKey = new Map(orderedColumns.map(col => [col.key, col]));
  const columnNameMap = new Map<string, CustomTableColumn>();
  const columnNameToField = new Map<string, PasteFieldKey>();
  const fieldToColumn = new Map<PasteFieldKey, CustomTableColumn>();

  for (const col of orderedColumns) {
    const inferredField = inferFieldFromColumn(col);
    if (col.title) {
      const normalized = normalizeToken(col.title);
      columnNameMap.set(normalized, col);
      if (inferredField) columnNameToField.set(normalized, inferredField);
    }
    if (col.key) {
      const normalized = normalizeToken(col.key);
      columnNameMap.set(normalized, col);
      if (inferredField) columnNameToField.set(normalized, inferredField);
    }
    if (inferredField && !fieldToColumn.has(inferredField)) {
      fieldToColumn.set(inferredField, col);
    }
  }

  const headersDetected = detectHeaderRow(rawRows, columnNameToField);
  const hasHeadersToggle = headersDetected || rawRows.length > 1;

  const { columns: sourceColumns, dataRows } = buildSourceColumns(rawRows, useHeaders);

  const mapping: Record<number, PasteMappingSelection> = mappingSelection ?? {};

  if (!mappingSelection) {
    const usedExisting = new Set<string>();
    for (const sourceColumn of sourceColumns) {
      const { index, header, sampleValues } = sourceColumn;
      const headerNormalized = normalizeToken(header);
      const headerField = matchFieldByName(header);
      const headerMatch = headerNormalized ? columnNameMap.get(headerNormalized) : null;

      const hasContent = Boolean(header) || sampleValues.length > 0;
      if (!hasContent) {
        mapping[index] = { mode: 'ignore' };
        continue;
      }

      if (useHeaders && headerMatch && !usedExisting.has(headerMatch.key)) {
        mapping[index] = {
          mode: 'existing',
          columnKey: headerMatch.key,
          field: inferFieldFromColumn(headerMatch),
        };
        usedExisting.add(headerMatch.key);
        continue;
      }

      if (useHeaders && headerField) {
        const fieldColumn = fieldToColumn.get(headerField);
        if (fieldColumn && !usedExisting.has(fieldColumn.key)) {
          mapping[index] = {
            mode: 'existing',
            columnKey: fieldColumn.key,
            field: headerField,
          };
          usedExisting.add(fieldColumn.key);
          continue;
        }
        mapping[index] = {
          mode: 'new',
          field: headerField,
          newTitle: header || defaults[headerField],
          newType: inferNewColumnType(headerField),
        };
        continue;
      }

      const inferredField = inferFieldFromValues(sampleValues);
      if (inferredField) {
        const fieldColumn = fieldToColumn.get(inferredField);
        if (fieldColumn && !usedExisting.has(fieldColumn.key)) {
          mapping[index] = {
            mode: 'existing',
            columnKey: fieldColumn.key,
            field: inferredField,
          };
          usedExisting.add(fieldColumn.key);
          continue;
        }
        mapping[index] = {
          mode: 'new',
          field: inferredField,
          newTitle: header || defaults[inferredField],
          newType: inferNewColumnType(inferredField),
        };
        continue;
      }

      mapping[index] = {
        mode: 'new',
        field: headerField ?? null,
        newTitle: header || `${defaults.columnPrefix} ${index + 1}`,
        newType: inferNewColumnType(headerField ?? null),
      };
    }
  }

  const mappedColumns: PasteColumnMapping[] = [];
  for (const sourceColumn of sourceColumns) {
    const selection = mapping[sourceColumn.index];
    if (!selection || selection.mode === 'ignore') continue;
    if (selection.mode === 'existing' && selection.columnKey) {
      const column = columnByKey.get(selection.columnKey);
      if (!column) continue;
      mappedColumns.push({
        sourceIndex: sourceColumn.index,
        field: (selection.field ?? inferFieldFromColumn(column) ?? 'comment') as PasteFieldKey,
        columnKey: column.key,
        label: column.title || column.key,
        options: column.config?.options,
        mode: 'existing',
      });
      continue;
    }

    const fallbackTitle =
      sourceColumn.header || `${defaults.columnPrefix} ${sourceColumn.index + 1}`;
    const resolvedTitle = selection.newTitle !== undefined ? selection.newTitle : fallbackTitle;
    const label = resolvedTitle?.trim() ? resolvedTitle : fallbackTitle;
    const field =
      selection.field === null
        ? ('comment' as PasteFieldKey)
        : (selection.field ?? matchFieldByName(resolvedTitle) ?? ('comment' as PasteFieldKey));
    mappedColumns.push({
      sourceIndex: sourceColumn.index,
      field,
      columnKey: `__new__${sourceColumn.index}`,
      label,
      mode: 'new',
      newTitle: resolvedTitle,
      newType: selection.newType ?? inferNewColumnType(field),
    });
  }

  if (!mappedColumns.length) {
    return {
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
    };
  }

  const dataPayload: Array<Record<string, any>> = [];
  const previewRows: PastePreviewRow[] = [];
  const errors: Record<PasteErrorKey, number> = {
    date: 0,
    amount: 0,
    currency: 0,
    paid: 0,
  };
  let hasErrors = false;

  dataRows.forEach((row, rowIndex) => {
    if (!row || row.every(cell => !String(cell ?? '').trim())) return;
    const rowData: Record<string, any> = {};
    const cells: PastePreviewCell[] = [];

    for (const col of mappedColumns) {
      const sourceIndex = col.sourceIndex;
      const key = sourceIndex !== null ? `${rowIndex}:${sourceIndex}` : '';
      const rawValue =
        sourceIndex !== null && row[sourceIndex] !== undefined ? String(row[sourceIndex]) : '';
      const editedValue = sourceIndex !== null && edits[key] !== undefined ? edits[key] : rawValue;
      const trimmed = editedValue.trim();
      let parsedValue: any = trimmed || null;
      let errorFlag = false;

      if (col.field === 'date') {
        const parsed = parseDateCell(editedValue);
        parsedValue = parsed.value;
        errorFlag = parsed.error;
        if (errorFlag) errors.date += 1;
      } else if (col.field === 'amount') {
        const parsed = parseNumberCell(editedValue);
        parsedValue = parsed.value;
        errorFlag = parsed.error;
        if (errorFlag) errors.amount += 1;
      } else if (col.field === 'currency') {
        const parsed = parseCurrencyCell(editedValue, col.options);
        parsedValue = parsed.value;
        errorFlag = parsed.error;
        if (errorFlag) errors.currency += 1;
      } else if (col.field === 'paid') {
        const parsed = parsePaidCell(editedValue);
        parsedValue = parsed.value;
        errorFlag = parsed.error;
        if (errorFlag) errors.paid += 1;
      }

      if (errorFlag) hasErrors = true;
      cells.push({
        value: trimmed,
        error: errorFlag,
        sourceIndex,
      });
      if (col.columnKey) rowData[col.columnKey] = parsedValue;
    }

    dataPayload.push(rowData);
    if (previewRows.length < 50) {
      previewRows.push({
        id: rowIndex,
        rowIndex,
        cells,
      });
    }
  });

  const totalRows = dataPayload.length;
  const extraRowsCount = totalRows > 50 ? totalRows - 50 : 0;

  return {
    preview: {
      totalRows,
      previewRows,
      dataRows: dataPayload,
      columns: mappedColumns,
      errors,
      hasErrors,
      extraRowsCount,
      hasHeadersToggle,
      headersDetected,
    },
    mapping,
    sourceColumns,
  };
};

export default function CustomTableDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useIntlayer('customTableDetailPage');
  const { locale } = useLocale();
  const tableId = params?.id;

  const dateFnsLocale = useMemo(() => {
    if (locale === 'ru') return ru;
    if (locale === 'kk') return kk;
    return enUS;
  }, [locale]);

  const [isFullscreen, setIsFullscreen] = useState(true);
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaDraft, setMetaDraft] = useState<{
    name: string;
    description: string;
  }>({
    name: '',
    description: '',
  });
  const [savingMeta, setSavingMeta] = useState(false);
  const [editingScope, setEditingScope] = useState<EditingScope | null>('both');

  const [table, setTable] = useState<CustomTable | null>(null);
  const [categories, setCategories] = useState<
    Array<{
      id: string;
      name: string;
      color?: string | null;
      icon?: string | null;
    }>
  >([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [rows, setRows] = useState<CustomTableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [gridFiltersParam, setGridFiltersParam] = useState<string | undefined>(undefined);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [activeTabId, setActiveTabId] = useState('all');
  const [stickyQuickTab, setStickyQuickTab] = useState<QuickTab | null>(null);
  const [activeTabFilter, setActiveTabFilter] = useState<RowFilter | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkMarking, setBulkMarking] = useState<'paid' | 'unpaid' | null>(null);
  const columnsTabId = '__columns__';
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>([]);

  const [newColumnOpen, setNewColumnOpen] = useState(false);
  const [newColumn, setNewColumn] = useState<{
    title: string;
    type: ColumnType;
  }>({
    title: '',
    type: 'text',
  });
  const [columnFilters, setColumnFilters] = useState<Record<string, any>>({});

  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const columnTypes = useMemo(
    () => [
      { value: 'text' as const, label: t.columnTypes.text.value },
      { value: 'number' as const, label: t.columnTypes.number.value },
      { value: 'date' as const, label: t.columnTypes.date.value },
      { value: 'boolean' as const, label: t.columnTypes.boolean.value },
      { value: 'select' as const, label: t.columnTypes.select.value },
      {
        value: 'multi_select' as const,
        label: t.columnTypes.multiSelect.value,
      },
    ],
    [t.columnTypes],
  );

  const pasteDefaults = useMemo(
    () => ({
      date: (t as any).paste.defaults.date.value,
      type: (t as any).paste.defaults.type.value,
      amount: (t as any).paste.defaults.amount.value,
      currency: (t as any).paste.defaults.currency.value,
      comment: (t as any).paste.defaults.comment.value,
      paid: (t as any).paste.defaults.paid.value,
      columnPrefix: (t as any).paste.defaults.columnPrefix.value,
    }),
    [t],
  );

  const DEFAULT_COLUMN_WIDTH = 180;
  const MIN_COLUMN_WIDTH = 60;
  const MAX_COLUMN_WIDTH = 1200;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const columnWidthTimersRef = useRef<Record<string, number>>({});

  const [deleteColumnModalOpen, setDeleteColumnModalOpen] = useState(false);
  const [deleteColumnTarget, setDeleteColumnTarget] = useState<CustomTableColumn | null>(null);
  const [deleteRowModalOpen, setDeleteRowModalOpen] = useState(false);
  const [deleteRowTarget, setDeleteRowTarget] = useState<CustomTableRow | null>(null);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteRowIds, setBulkDeleteRowIds] = useState<string[]>([]);
  const [rowDrawerOpen, setRowDrawerOpen] = useState(false);
  const [rowDrawerMode, setRowDrawerMode] = useState<'view' | 'edit'>('view');
  const [rowDrawerRowId, setRowDrawerRowId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [tabCounts, setTabCounts] = useState<{
    total: number;
    paid: number | null;
    unpaid: number | null;
  }>({ total: 0, paid: null, unpaid: null });
  const [pastePreviewOpen, setPastePreviewOpen] = useState(false);
  const [pasteParsing, setPasteParsing] = useState(false);
  const [pasteApplying, setPasteApplying] = useState(false);
  const [pasteRawRows, setPasteRawRows] = useState<string[][]>([]);
  const [pasteUseHeaders, setPasteUseHeaders] = useState(false);
  const [pastePreview, setPastePreview] = useState<PastePreviewData | null>(null);
  const [pasteMapping, setPasteMapping] = useState<Record<number, PasteMappingSelection>>({});
  const [pasteEdits, setPasteEdits] = useState<Record<string, string>>({});
  const pastePreviewTimerRef = useRef<number | null>(null);

  const hasMissingPasteColumnTitles = useMemo(
    () => Boolean(pastePreview?.columns.some(col => col.mode === 'new' && !col.newTitle?.trim())),
    [pastePreview],
  );

  /* original orderedColumns */
  const orderedColumns = useMemo(() => {
    const cols = table?.columns || [];
    return [...cols].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [table?.columns]);

  useEffect(() => {
    if (!tableId) return;
    const storageKey = `custom-table:${tableId}:columns`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        order?: string[];
        hidden?: string[];
      };
      if (Array.isArray(parsed.order)) setColumnOrder(parsed.order);
      if (Array.isArray(parsed.hidden)) setHiddenColumnKeys(parsed.hidden);
    } catch (error) {
      console.warn('Failed to load column settings:', error);
    }
  }, [tableId]);

  useEffect(() => {
    if (!tableId) return;
    const storageKey = `custom-table:${tableId}:columns`;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ order: columnOrder, hidden: hiddenColumnKeys }),
      );
    } catch (error) {
      console.warn('Failed to persist column settings:', error);
    }
  }, [tableId, columnOrder, hiddenColumnKeys]);

  useEffect(() => {
    const keys = orderedColumns.map(c => c.key);
    setColumnOrder(prev => {
      if (!prev.length) return keys;
      const next = prev.filter(k => keys.includes(k));
      keys.forEach(k => {
        if (!next.includes(k)) next.push(k);
      });
      return next;
    });
    setHiddenColumnKeys(prev => prev.filter(k => keys.includes(k)));
  }, [orderedColumns]);

  const paidColKey = useMemo(() => {
    const re = /(paid|unpaid|оплач|оплата|неоплач)/i;
    const col = orderedColumns.find(
      c => c.type === 'boolean' && (re.test(c.title) || re.test(c.key)),
    );
    return col?.key || null;
  }, [orderedColumns]);

  const orderedVisibleColumns = useMemo(() => {
    const columnsByKey = new Map(orderedColumns.map(c => [c.key, c]));
    const orderedKeys = columnOrder.length ? columnOrder : orderedColumns.map(c => c.key);
    const hiddenSet = new Set(hiddenColumnKeys);
    const ordered = orderedKeys
      .map(key => columnsByKey.get(key))
      .filter(Boolean) as CustomTableColumn[];
    return ordered.filter(col => !hiddenSet.has(col.key));
  }, [orderedColumns, columnOrder, hiddenColumnKeys]);

  const isColumnsDefault = useMemo(() => {
    const defaultKeys = orderedColumns.map(c => c.key);
    const currentOrder = columnOrder.length ? columnOrder : defaultKeys;
    if (currentOrder.length !== defaultKeys.length) return false;
    for (let i = 0; i < defaultKeys.length; i += 1) {
      if (currentOrder[i] !== defaultKeys[i]) return false;
    }
    return hiddenColumnKeys.length === 0;
  }, [orderedColumns, columnOrder, hiddenColumnKeys]);

  const displayColumns = useMemo(() => {
    return orderedVisibleColumns.map(c => {
      if (c.key === paidColKey) {
        return { ...c, title: (t as any).paidColumn.value };
      }
      return c;
    });
  }, [orderedVisibleColumns, paidColKey, t]);

  const dateColKey = useMemo(() => {
    const col = orderedColumns.find(c => c.type === 'date');
    return col?.key || null;
  }, [orderedColumns]);

  const counterpartyColKey = useMemo(() => {
    const re = /(контрагент|counterparty|counter party|client|customer|payer|payee|partner)/i;
    const col = orderedColumns.find(c => re.test(`${c.title ?? ''} ${c.key ?? ''}`));
    return col?.key || null;
  }, [orderedColumns]);

  const stickyLeftColumnIds = useMemo(
    () =>
      ['__select', dateColKey || undefined, counterpartyColKey || undefined].filter(
        Boolean,
      ) as string[],
    [dateColKey, counterpartyColKey],
  );

  const stickyRightColumnIds = useMemo(() => ['__actions'], []);

  const refreshStats = useCallback(async () => {
    if (!tableId || !user) return;
    try {
      const totalResp = await apiClient.get(`/custom-tables/${tableId}/rows`, {
        params: { limit: 1 },
      });
      // Handle both new backend structure (meta.total) and fallback
      const total =
        totalResp.data?.meta?.total ?? totalResp.data?.total ?? totalResp.data?.items?.length ?? 0;

      let paidCount: number | null = null;
      let unpaidCount: number | null = null;

      if (paidColKey) {
        const paidResp = await apiClient.get(`/custom-tables/${tableId}/rows`, {
          params: {
            limit: 1,
            filters: JSON.stringify([{ col: paidColKey, op: 'eq', value: true }]),
          },
        });
        paidCount =
          paidResp.data?.meta?.total ?? paidResp.data?.total ?? paidResp.data?.items?.length ?? 0;

        const unpaidResp = await apiClient.get(`/custom-tables/${tableId}/rows`, {
          params: {
            limit: 1,
            filters: JSON.stringify([{ col: paidColKey, op: 'eq', value: false }]),
          },
        });
        unpaidCount =
          unpaidResp.data?.meta?.total ??
          unpaidResp.data?.total ??
          unpaidResp.data?.items?.length ??
          0;
      }

      setTabCounts(prev => ({
        ...prev,
        total,
        paid: paidCount,
        unpaid: unpaidCount,
      }));
    } catch (error) {
      console.error('Failed to fetch table stats:', error);
    }
  }, [tableId, user, paidColKey]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const quickTabs = useMemo<QuickTab[]>(() => {
    const baseTabs: QuickTab[] = [{ id: 'all', label: (t as any).tabs.all.value }];

    if (paidColKey && tabCounts.paid !== null && tabCounts.unpaid !== null) {
      baseTabs.push(
        {
          id: `${paidColKey}:Yes`,
          label: (t as any).tabs.paid.value,
          filter: { col: paidColKey, op: 'eq', value: true },
          count: tabCounts.paid,
        },
        {
          id: `${paidColKey}:No`,
          label: (t as any).tabs.unpaid.value,
          filter: { col: paidColKey, op: 'eq', value: false },
          count: tabCounts.unpaid,
        },
      );
    }

    if (!orderedColumns.length) return baseTabs;

    const candidates = orderedColumns.filter(c => {
      if (paidColKey && c.key === paidColKey) return false;
      return c.type === 'select' || c.type === 'multi_select' || c.type === 'boolean';
    });
    if (!candidates.length) return baseTabs;

    let best:
      | {
          colKey: string;
          colType: ColumnType;
          topValues: Array<{ value: string; count: number; rawValue: any }>;
        }
      | undefined;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const col of candidates) {
      const counts = new Map<string, { count: number; rawValue: any }>();

      for (const row of rows) {
        const raw = row.data?.[col.key];
        if (raw === null || raw === undefined || raw === '') continue;

        if (col.type === 'multi_select') {
          const arr = Array.isArray(raw) ? raw : [raw];
          for (const v of arr) {
            const value = String(v ?? '').trim();
            if (!value) continue;
            const prev = counts.get(value);
            counts.set(value, {
              count: (prev?.count ?? 0) + 1,
              rawValue: value,
            });
          }
          continue;
        }

        if (col.type === 'boolean') {
          const bool = normalizeBooleanValue(raw);
          const value = bool ? 'Yes' : 'No';
          const prev = counts.get(value);
          counts.set(value, { count: (prev?.count ?? 0) + 1, rawValue: bool });
          continue;
        }

        const value = String(raw).trim();
        if (!value) continue;
        const prev = counts.get(value);
        counts.set(value, { count: (prev?.count ?? 0) + 1, rawValue: value });
      }

      const distinct = counts.size;
      if (distinct < 2 || distinct > 20) continue;

      const topValues = Array.from(counts.entries())
        .map(([value, meta]) => ({
          value,
          count: meta.count,
          rawValue: meta.rawValue,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);
      if (!topValues.length) continue;

      const weight = col.type === 'multi_select' ? 1.1 : col.type === 'select' ? 1.2 : 1.0;
      const score = topValues[0].count * weight;

      if (score > bestScore) {
        bestScore = score;
        best = { colKey: col.key, colType: col.type, topValues };
      }
    }

    if (!best) return baseTabs;

    const extraTabs: QuickTab[] = best.topValues.map(({ value, count, rawValue }) => {
      const filter: RowFilter =
        best.colType === 'multi_select'
          ? { col: best.colKey, op: 'in', value: [String(rawValue)] }
          : best.colType === 'boolean'
            ? { col: best.colKey, op: 'eq', value: Boolean(rawValue) }
            : { col: best.colKey, op: 'eq', value: String(rawValue) };

      return { id: `${best.colKey}:${value}`, label: value, filter, count };
    });

    const tabs = [...baseTabs, ...extraTabs].slice(0, 5);
    if (stickyQuickTab && activeTabId === stickyQuickTab.id) {
      const exists = tabs.some(tab => tab.id === stickyQuickTab.id);
      if (!exists) return [...tabs, stickyQuickTab].slice(0, 5);
    }
    return tabs;
  }, [orderedColumns, rows, stickyQuickTab, activeTabId]);

  useEffect(() => {
    const isSticky = stickyQuickTab?.id === activeTabId;
    const nextTab = quickTabs.find(t => t.id === activeTabId) || (isSticky ? stickyQuickTab : null);
    if (activeTabId === columnsTabId) {
      setActiveTabFilter(null);
      return;
    }
    if (!nextTab && !isSticky) {
      setActiveTabId('all');
      setActiveTabFilter(null);
      return;
    }
    if (activeTabId === 'all') {
      setActiveTabFilter(null);
      if (stickyQuickTab) setStickyQuickTab(null);
      return;
    }
    if (nextTab?.filter) {
      setActiveTabFilter(nextTab.filter);
    }
  }, [quickTabs, activeTabId, stickyQuickTab]);

  useEffect(() => {
    setSelectedRowIds([]);
  }, [activeTabId]);

  const displayRows = useMemo(() => {
    if (!activeTabFilter) return rows;
    return rows.filter(row => rowMatchesFilter(row, activeTabFilter));
  }, [rows, activeTabFilter]);

  useEffect(() => {
    if (!selectedRowIds.length) return;
    const visibleIds = new Set(displayRows.map(r => r.id));
    setSelectedRowIds(prev => prev.filter(id => visibleIds.has(id)));
  }, [displayRows, selectedRowIds.length]);

  const drawerRow = useMemo(() => {
    if (!rowDrawerRowId) return null;
    return rows.find(r => r.id === rowDrawerRowId) || null;
  }, [rows, rowDrawerRowId]);

  const openRowDrawer = (rowId: string, mode: 'view' | 'edit') => {
    setRowDrawerRowId(rowId);
    setRowDrawerMode(mode);
    setRowDrawerOpen(true);
  };

  const closeRowDrawer = () => {
    setRowDrawerOpen(false);
    setRowDrawerRowId(null);
    setRowDrawerMode('view');
  };

  useEffect(() => {
    if (!rowDrawerOpen || !rowDrawerRowId) return;
    const exists = rows.some(r => r.id === rowDrawerRowId);
    if (!exists) closeRowDrawer();
  }, [rowDrawerOpen, rowDrawerRowId, rows]);

  useEffect(() => {
    const allowed = new Set(orderedColumns.map(c => c.key));
    setSelectedColumnKeys(prev => prev.filter(k => allowed.has(k)));
  }, [orderedColumns]);

  useEffect(() => {
    if (!tableId || !orderedColumns.length) return;
    const storageKey = `custom-table:${tableId}:column-widths`;
    let localWidths: Record<string, number> = {};
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          localWidths = parsed as Record<string, number>;
        }
      }
    } catch (error) {
      console.warn('Failed to load column widths from storage:', error);
    }

    const viewCols =
      (table?.viewSettings && typeof table.viewSettings === 'object'
        ? (table.viewSettings as any).columns
        : null) || {};
    const hasServerWidths = Object.values(viewCols).some(
      (entry: any) => typeof entry?.width === 'number' && Number.isFinite(entry.width),
    );

    const newWidths: Record<string, number> = {};
    for (const col of orderedColumns) {
      const serverWidth = viewCols?.[col.key]?.width;
      const localWidth = localWidths[col.key];
      let width: number | undefined;

      if (hasServerWidths && typeof serverWidth === 'number' && Number.isFinite(serverWidth)) {
        width = serverWidth;
      } else if (typeof localWidth === 'number' && Number.isFinite(localWidth) && localWidth > 0) {
        width = localWidth;
      } else if (!hasServerWidths && typeof serverWidth === 'number') {
        width = serverWidth;
      }

      if (!(typeof width === 'number' && Number.isFinite(width))) {
        width = (col as any).width;
      }
      if (!(typeof width === 'number' && Number.isFinite(width))) {
        width = DEFAULT_COLUMN_WIDTH;
      }
      newWidths[col.key] = width;
    }
    setColumnWidths(newWidths);
  }, [tableId, table?.id, orderedColumns, DEFAULT_COLUMN_WIDTH]);

  const clampWidth = (width: number) =>
    Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, width));

  const getColumnWidth = (colKey: string) => {
    const width = columnWidths[colKey];
    if (typeof width === 'number' && Number.isFinite(width)) return width;
    return DEFAULT_COLUMN_WIDTH;
  };

  const gridColumnWidths = useMemo(() => {
    const next: Record<string, number> = {};
    for (const col of orderedColumns) {
      next[col.key] = getColumnWidth(col.key);
    }
    return next;
  }, [orderedColumns, columnWidths]);

  useEffect(() => {
    return () => {
      const timers = columnWidthTimersRef.current;
      Object.values(timers).forEach(timerId => window.clearTimeout(timerId));
    };
  }, []);

  const persistColumnWidth = async (colKey: string, width: number) => {
    if (!tableId) return;
    const prevWidth = getColumnWidth(colKey);
    const finalWidth = clampWidth(width);
    if (Math.abs(finalWidth - prevWidth) < 1) return;

    const storageKey = `custom-table:${tableId}:column-widths`;
    setColumnWidths(prev => {
      const next = { ...prev, [colKey]: finalWidth };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (error) {
        console.warn('Failed to persist column widths to storage:', error);
      }
      return next;
    });

    if (!user) return;

    const existing = columnWidthTimersRef.current[colKey];
    if (existing) window.clearTimeout(existing);
    columnWidthTimersRef.current[colKey] = window.setTimeout(async () => {
      try {
        await apiClient.patch(`/custom-tables/${tableId}/view-settings/columns`, {
          columnKey: colKey,
          width: finalWidth,
        });
      } catch (error) {
        console.error('Failed to persist column width:', error);
        toast.error(t.grid.columnWidthSaveFailed.value);
      } finally {
        delete columnWidthTimersRef.current[colKey];
      }
    }, 800);
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      const payload = response.data?.data || response.data || [];
      setCategories(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadTable = async () => {
    if (!tableId) return;
    setLoading(true);
    try {
      const response = await apiClient.get(`/custom-tables/${tableId}`);
      const payload = response.data?.data || response.data;
      setTable(payload);
      const currentCategoryId = payload?.categoryId || payload?.category?.id || '';
      setCategoryId(currentCategoryId || '');
    } catch (error) {
      console.error('Failed to load table:', error);
      toast.error(t.grid.loadTableFailed.value);
    } finally {
      setLoading(false);
    }
  };

  const loadRows = async (opts?: {
    reset?: boolean;
    filtersParam?: string;
  }) => {
    if (!tableId) return;
    if (loadingRows) return;
    setLoadingRows(true);
    try {
      const cursor = opts?.reset ? undefined : rows[rows.length - 1]?.rowNumber;
      const filters = opts?.filtersParam !== undefined ? opts.filtersParam : combinedFiltersParam;
      const response = await apiClient.get(`/custom-tables/${tableId}/rows`, {
        params: { cursor, limit: 50, filters },
      });
      const items = response.data?.items || response.data?.data?.items || [];
      const next = Array.isArray(items) ? items : [];
      setRows(prev => {
        const merged = opts?.reset ? next : [...prev, ...next];
        const seen = new Set<string>();
        const deduped: typeof merged = [];
        for (const row of merged) {
          const id = (row as any)?.id || String((row as any)?.rowNumber);
          if (!id || seen.has(id)) continue;
          seen.add(id);
          deduped.push(row);
        }
        return deduped;
      });
      setHasMore(next.length >= 50);
    } catch (error) {
      console.error('Failed to load rows:', error);
      toast.error(t.grid.loadRowsFailed.value);
    } finally {
      setLoadingRows(false);
    }
  };

  const onGridFiltersParamChange = (next: string | undefined) => {
    if (next === gridFiltersParam) return;
    setGridFiltersParam(next);
  };

  const parseDateValue = (value: unknown): Date | null => {
    if (!value) return null;
    const raw = typeof value === 'string' ? value : String(value);
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const requestFilters = useMemo<RowFilter[]>(() => {
    const result: RowFilter[] = [];
    const toIsoDate = (date: Date) => format(date, 'yyyy-MM-dd', { locale: dateFnsLocale });

    for (const col of orderedColumns) {
      const state = columnFilters[col.key];
      if (!state) continue;

      if (col.type === 'number') {
        const min = state?.min !== undefined && state?.min !== '' ? Number(state.min) : undefined;
        const max = state?.max !== undefined && state?.max !== '' ? Number(state.max) : undefined;
        if (Number.isFinite(min) && Number.isFinite(max)) {
          result.push({ col: col.key, op: 'between', value: [min, max] });
        } else if (Number.isFinite(min)) {
          result.push({ col: col.key, op: 'gte', value: min });
        } else if (Number.isFinite(max)) {
          result.push({ col: col.key, op: 'lte', value: max });
        }
        continue;
      }

      if (col.type === 'date') {
        const from = state?.from ? new Date(`${state.from}T00:00:00`) : undefined;
        const to = state?.to ? new Date(`${state.to}T00:00:00`) : undefined;
        const fromOk = from && !Number.isNaN(from.getTime());
        const toOk = to && !Number.isNaN(to.getTime());
        if (fromOk && toOk && from && to) {
          result.push({
            col: col.key,
            op: 'between',
            value: [toIsoDate(from), toIsoDate(to)],
          });
        } else if (fromOk && from) {
          result.push({ col: col.key, op: 'gte', value: toIsoDate(from) });
        } else if (toOk && to) {
          result.push({ col: col.key, op: 'lte', value: toIsoDate(to) });
        }
        continue;
      }

      const op: RowFilterOp = state?.op || 'contains';
      if (op === 'isEmpty' || op === 'isNotEmpty') {
        result.push({ col: col.key, op });
        continue;
      }
      const rawValue = typeof state?.value === 'string' ? state.value : String(state?.value ?? '');
      const value = rawValue.trim();
      if (!value) continue;
      result.push({ col: col.key, op, value });
    }
    return result;
  }, [orderedColumns, columnFilters, dateFnsLocale]);

  const dateFilterColKey = useMemo(() => {
    const firstDateCol = orderedColumns.find(c => c.type === 'date');
    return firstDateCol?.key || null;
  }, [orderedColumns]);

  const dateFilters = useMemo<RowFilter[]>(() => {
    if (!dateFilterColKey) return [];
    const from = parseDateValue(dateFrom);
    const to = parseDateValue(dateTo);
    const fromOk = from && !Number.isNaN(from.getTime());
    const toOk = to && !Number.isNaN(to.getTime());
    if (!fromOk && !toOk) return [];
    const toIsoDate = (date: Date) => format(date, 'yyyy-MM-dd', { locale: dateFnsLocale });
    if (fromOk && toOk && from && to) {
      return [
        {
          col: dateFilterColKey,
          op: 'between',
          value: [toIsoDate(from), toIsoDate(to)],
        },
      ];
    }
    if (fromOk && from) return [{ col: dateFilterColKey, op: 'gte', value: toIsoDate(from) }];
    if (toOk && to) return [{ col: dateFilterColKey, op: 'lte', value: toIsoDate(to) }];
    return [];
  }, [dateFilterColKey, dateFrom, dateTo, dateFnsLocale]);

  const searchFilter = useMemo<RowFilter | null>(() => {
    const value = searchQuery.trim();
    if (!value) return null;
    return { col: '__search__', op: 'search', value };
  }, [searchQuery]);

  const combinedFiltersParam = useMemo(() => {
    const base = parseFiltersParam(gridFiltersParam);
    const tabFilters = activeTabFilter ? [activeTabFilter] : [];
    const searchFilters = searchFilter ? [searchFilter] : [];
    const overrideCols = new Set<string>([
      ...requestFilters.map(f => f.col),
      ...dateFilters.map(f => f.col),
      ...tabFilters.map(f => f.col),
      ...searchFilters.map(f => f.col),
    ]);
    const baseWithoutOverrides = base.filter(f => !overrideCols.has(f.col));
    const merged = [
      ...baseWithoutOverrides,
      ...requestFilters,
      ...dateFilters,
      ...tabFilters,
      ...searchFilters,
    ];
    return merged.length ? JSON.stringify(merged) : undefined;
  }, [gridFiltersParam, requestFilters, dateFilters, activeTabFilter, searchFilter]);

  function parseFiltersParam(raw: string | undefined): RowFilter[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as RowFilter[]) : [];
    } catch {
      return [];
    }
  }

  useEffect(() => {
    if (!user || !tableId) return;
    setHasMore(true);
    const timer = window.setTimeout(() => {
      loadRows({ reset: true, filtersParam: combinedFiltersParam });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [combinedFiltersParam, user, tableId]);

  useEffect(() => {
    if (!user) return;
    if (isFullscreen) {
      document.body.classList.add('ff-table-fullscreen');
    } else {
      document.body.classList.remove('ff-table-fullscreen');
    }
    if (isFullscreen && activeTabId === columnsTabId) {
      document.body.classList.add('ff-table-columns-scroll');
    } else {
      document.body.classList.remove('ff-table-columns-scroll');
    }
    return () => {
      document.body.classList.remove('ff-table-fullscreen');
      document.body.classList.remove('ff-table-columns-scroll');
    };
  }, [isFullscreen, user, activeTabId, columnsTabId]);

  useEffect(() => {
    setMounted(true);
  }, []);
  const startPastePreview = useCallback(
    (text: string) => {
      if (!orderedColumns.length) return;
      const { rows } = parseClipboardRows(text);
      if (!rows.length) return;
      setPasteRawRows(rows);
      setPastePreviewOpen(true);
      setPasteParsing(true);
      setPasteEdits({});
      window.setTimeout(() => {
        const initial = buildPastePreview(rows, false, orderedColumns, null, {}, pasteDefaults);
        const shouldUseHeaders = initial.preview.headersDetected;
        if (shouldUseHeaders) {
          const withHeaders = buildPastePreview(
            rows,
            true,
            orderedColumns,
            null,
            {},
            pasteDefaults,
          );
          setPasteUseHeaders(true);
          setPastePreview(withHeaders.preview);
          setPasteMapping(withHeaders.mapping);
        } else {
          setPasteUseHeaders(false);
          setPastePreview(initial.preview);
          setPasteMapping(initial.mapping);
        }
        setPasteParsing(false);
      }, 0);
    },
    [orderedColumns, pasteDefaults],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (pastePreviewOpen || pasteApplying) return;
      if (!orderedColumns.length) return;
      if (isEditableTarget(event.target)) return;
      const clipboardText = event.clipboardData?.getData('text/plain') || '';
      if (!clipboardText) return;
      const normalized = clipboardText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const hasMultipleLines = normalized.split('\n').length > 1;
      if (!normalized.includes('\t') && !hasMultipleLines) return;
      event.preventDefault();
      startPastePreview(clipboardText);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [pastePreviewOpen, pasteApplying, orderedColumns.length, startPastePreview]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag && ['input', 'textarea', 'select'].includes(tag)) return;
      if (target && (target as any).isContentEditable) return;
      if (event.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    if (!authLoading && user && tableId) {
      loadCategories();
      loadTable();
      loadRows({ reset: true });
    }
  }, [authLoading, user, tableId]);

  useEffect(() => {
    if (!table || editingMeta) return;
    setMetaDraft({
      name: table.name || '',
      description: table.description || '',
    });
  }, [table?.id, table?.name, table?.description, editingMeta]);

  const cancelEditMeta = () => {
    setEditingMeta(false);
    setMetaDraft({
      name: table?.name || '',
      description: table?.description || '',
    });
    setEditingScope(null);
  };

  const saveMeta = async () => {
    if (!tableId) return;
    const scope: EditingScope = editingScope ?? 'both';
    const payload: Record<string, unknown> = {};
    if (scope !== 'description') {
      const name = metaDraft.name.trim();
      if (!name) {
        toast.error(t.meta.nameRequired.value);
        return;
      }
      payload.name = name;
    }
    if (scope !== 'name') {
      const description = metaDraft.description.trim();
      payload.description = description ? description : null;
    }
    if (!Object.keys(payload).length) {
      setEditingMeta(false);
      setEditingScope(null);
      return;
    }
    setSavingMeta(true);
    try {
      await apiClient.patch(`/custom-tables/${tableId}`, payload);
      setEditingMeta(false);
      setEditingScope(null);
      await loadTable();
      toast.success(t.meta.saved.value);
    } catch (error) {
      console.error('Failed to update table meta:', error);
      toast.error(t.meta.saveFailed.value);
    } finally {
      setSavingMeta(false);
    }
  };

  const createRow: () => Promise<CustomTableGridRow | null> = async () => {
    if (!tableId) return null;
    const toastId = toast.loading(t.addRow.loading.value);
    try {
      const response = await apiClient.post(`/custom-tables/${tableId}/rows`, {
        data: {},
      });
      const payload = response.data?.data ?? response.data?.item ?? response.data;
      const createdRaw = Array.isArray(payload) ? payload[0] : payload;
      if (!createdRaw || typeof createdRaw !== 'object') {
        throw new Error('Invalid create row response');
      }
      const id =
        (createdRaw as any)?.id ||
        (createdRaw as any)?.rowId ||
        (createdRaw as any)?.row_id ||
        (createdRaw as any)?.rowNumber?.toString() ||
        `temp-${Date.now()}`;
      const rowNumber =
        (createdRaw as any)?.rowNumber ?? (createdRaw as any)?.row_number ?? rows.length + 1;
      const created: CustomTableGridRow = {
        id: id as string,
        rowNumber: typeof rowNumber === 'number' ? rowNumber : rows.length + 1,
        data: (createdRaw as any)?.data ?? {},
        styles: (createdRaw as any)?.styles ?? null,
      };
      setRows(prev => [...prev, created]);
      toast.success(t.addRow.success.value, { id: toastId });
      refreshStats();
      return created;
    } catch (error) {
      console.error('Failed to add row:', error);
      toast.error(t.addRow.failed.value, { id: toastId });
      return null;
    }
  };

  const resetPastePreview = useCallback(() => {
    setPastePreviewOpen(false);
    setPastePreview(null);
    setPasteRawRows([]);
    setPasteUseHeaders(false);
    setPasteParsing(false);
    setPasteApplying(false);
    setPasteMapping({});
    setPasteEdits({});
    if (pastePreviewTimerRef.current) {
      window.clearTimeout(pastePreviewTimerRef.current);
      pastePreviewTimerRef.current = null;
    }
  }, []);

  const buildPreviewAsync = useCallback(
    (
      rows: string[][],
      useHeaders: boolean,
      mappingSelection: Record<number, PasteMappingSelection> | null,
      edits: Record<string, string>,
    ) => {
      setPasteParsing(true);
      if (pastePreviewTimerRef.current) {
        window.clearTimeout(pastePreviewTimerRef.current);
      }
      pastePreviewTimerRef.current = window.setTimeout(() => {
        const result = buildPastePreview(
          rows,
          useHeaders,
          orderedColumns,
          mappingSelection,
          edits,
          pasteDefaults,
        );
        setPastePreview(result.preview);
        setPasteMapping(result.mapping);
        setPasteParsing(false);
        pastePreviewTimerRef.current = null;
      }, 0);
    },
    [orderedColumns, pasteDefaults],
  );

  const handlePasteHeadersToggle = useCallback(
    (checked: boolean) => {
      setPasteUseHeaders(checked);
      if (!pasteRawRows.length) return;
      setPasteEdits({});
      buildPreviewAsync(pasteRawRows, checked, null, {});
    },
    [pasteRawRows, buildPreviewAsync],
  );

  const rebuildPasteWithState = useCallback(
    (nextMapping: Record<number, PasteMappingSelection>, nextEdits: Record<string, string>) => {
      if (!pasteRawRows.length) return;
      buildPreviewAsync(pasteRawRows, pasteUseHeaders, nextMapping, nextEdits);
    },
    [pasteRawRows, pasteUseHeaders, buildPreviewAsync],
  );

  const handlePasteCellChange = useCallback(
    (rowIndex: number, sourceIndex: number, value: string) => {
      setPasteEdits(prev => {
        const next = { ...prev, [`${rowIndex}:${sourceIndex}`]: value };
        rebuildPasteWithState(pasteMapping, next);
        return next;
      });
    },
    [pasteMapping, rebuildPasteWithState],
  );

  const appendRows = useCallback((createdRows: CustomTableGridRow[]) => {
    setRows(prev => {
      const merged = [...prev, ...createdRows];
      const seen = new Set<string>();
      const deduped: CustomTableGridRow[] = [];
      for (const row of merged) {
        const id = row.id || String(row.rowNumber);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        deduped.push(row);
      }
      deduped.sort((a, b) => (a.rowNumber ?? 0) - (b.rowNumber ?? 0));
      return deduped;
    });
  }, []);

  const rollbackRows = useCallback(
    async (rowIds: string[]) => {
      if (!tableId || !rowIds.length) return;
      try {
        await Promise.all(
          rowIds.map(rowId => apiClient.delete(`/custom-tables/${tableId}/rows/${rowId}`)),
        );
        setRows(prev => prev.filter(row => !rowIds.includes(row.id)));
        refreshStats();
      } catch (error) {
        console.error('Failed to rollback rows:', error);
        toast.error((t as any).paste.undoFailed.value);
      }
    },
    [tableId, refreshStats, t],
  );

  const handlePasteAdd = useCallback(async () => {
    if (!tableId || !pastePreview || pasteApplying) return;
    if (!pastePreview.dataRows.length) {
      toast.error((t as any).paste.noRows.value);
      return;
    }
    if (pastePreview.hasErrors) return;
    setPasteApplying(true);
    try {
      const newColumns = pastePreview.columns.filter(col => col.mode === 'new');
      const missingTitles = newColumns.some(col => !col.newTitle || !col.newTitle.trim());
      if (missingTitles) {
        toast.error((t as any).paste.missingColumnTitle.value);
        setPasteApplying(false);
        return;
      }
      const placeholderToKey = new Map<string, string>();
      if (newColumns.length) {
        const created = await Promise.all(
          newColumns.map(col =>
            apiClient.post(`/custom-tables/${tableId}/columns`, {
              title: col.newTitle?.trim(),
              type: col.newType ?? 'text',
            }),
          ),
        );
        created.forEach((response, index) => {
          const payload = response.data?.data || response.data;
          const key = payload?.key;
          const placeholderKey = newColumns[index]?.columnKey || '';
          if (key && placeholderKey) {
            placeholderToKey.set(placeholderKey, key);
          }
        });
        await loadTable();
      }

      const payloadRows = pastePreview.dataRows.map(row => {
        const data: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          const actualKey = placeholderToKey.get(key) || key;
          data[actualKey] = value;
        }
        return { data };
      });

      const response = await apiClient.post(`/custom-tables/${tableId}/rows/batch`, {
        rows: payloadRows,
      });
      const responsePayload = response.data || {};
      const createdRows =
        responsePayload.rows ||
        responsePayload.data?.rows ||
        responsePayload.items ||
        responsePayload.data?.items ||
        [];
      const normalizedRows: CustomTableGridRow[] = Array.isArray(createdRows) ? createdRows : [];
      const createdCount =
        responsePayload.created ??
        responsePayload.data?.created ??
        normalizedRows.length ??
        pastePreview.dataRows.length;
      if (normalizedRows.length) {
        appendRows(normalizedRows);
      }
      resetPastePreview();
      refreshStats();

      const undoWindowMs = 8000;
      const undoIds = normalizedRows.map(row => row.id).filter(Boolean);
      let undoExpired = false;
      const timeoutId = window.setTimeout(() => {
        undoExpired = true;
      }, undoWindowMs);
      const toastId = toast.custom(
        toastProps => (
          <div
            className={`${
              toastProps.visible ? 'animate-enter' : 'animate-leave'
            } flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg`}
          >
            <span className="text-sm text-gray-800">
              {(t as any).paste.addedPrefix.value}
              {createdCount}
              {(t as any).paste.addedSuffix.value}
            </span>
            {undoIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (undoExpired) return;
                  undoExpired = true;
                  window.clearTimeout(timeoutId);
                  toast.dismiss(toastId);
                  rollbackRows(undoIds);
                }}
                className="text-sm font-semibold text-primary hover:text-primary-hover"
              >
                {(t as any).paste.undo.value}
              </button>
            )}
          </div>
        ),
        { duration: undoWindowMs },
      );
    } catch (error) {
      console.error('Failed to batch insert rows:', error);
      toast.error((t as any).paste.insertFailed.value);
    } finally {
      setPasteApplying(false);
    }
  }, [
    tableId,
    pastePreview,
    pasteApplying,
    appendRows,
    resetPastePreview,
    loadTable,
    refreshStats,
    rollbackRows,
    t,
  ]);

  const updateCellFromGrid = async (rowId: string, columnKey: string, value: any) => {
    if (!tableId) return;
    if (rowId.startsWith('temp-')) {
      setRows(prev =>
        prev.map(r =>
          r.id === rowId ? { ...r, data: { ...(r.data || {}), [columnKey]: value } } : r,
        ),
      );
      if (columnKey === paidColKey) {
        refreshStats();
      }
      return;
    }
    try {
      await apiClient.patch(`/custom-tables/${tableId}/rows/${rowId}`, {
        data: { [columnKey]: value },
      });
      setRows(prev =>
        prev.map(r =>
          r.id === rowId ? { ...r, data: { ...(r.data || {}), [columnKey]: value } } : r,
        ),
      );
      if (columnKey === paidColKey) {
        refreshStats();
      }
    } catch (error) {
      console.error('Failed to update cell:', error);
      toast.error(t.grid.saveValueFailed.value);
    }
  };

  const updateRowFromDrawer = async (rowId: string, patchData: Record<string, any>) => {
    if (!tableId) return;
    if (!Object.keys(patchData).length) return;
    if (rowId.startsWith('temp-')) {
      setRows(prev =>
        prev.map(r => (r.id === rowId ? { ...r, data: { ...(r.data || {}), ...patchData } } : r)),
      );
      if (paidColKey && Object.prototype.hasOwnProperty.call(patchData, paidColKey)) {
        refreshStats();
      }
      return;
    }
    await apiClient.patch(`/custom-tables/${tableId}/rows/${rowId}`, {
      data: patchData,
    });
    setRows(prev =>
      prev.map(r => (r.id === rowId ? { ...r, data: { ...(r.data || {}), ...patchData } } : r)),
    );
    if (paidColKey && Object.prototype.hasOwnProperty.call(patchData, paidColKey)) {
      refreshStats();
    }
  };

  const updateRowStyle = async (rowId: string, styles: Record<string, any>) => {
    if (!tableId) return;
    try {
      const row = rows.find(r => r.id === rowId);
      const mergedStyles = { ...(row?.styles || {}), ...styles };
      if (rowId.startsWith('temp-')) {
        setRows(prev => prev.map(r => (r.id === rowId ? { ...r, styles: mergedStyles } : r)));
        return;
      }
      await apiClient.patch(`/custom-tables/${tableId}/rows/${rowId}`, {
        data: row?.data || {},
        styles: mergedStyles,
      });
      setRows(prev => prev.map(r => (r.id === rowId ? { ...r, styles: mergedStyles } : r)));
    } catch (error) {
      console.error('Failed to update row styles:', error);
      toast.error(t.grid.saveValueFailed.value);
    }
  };

  const saveRowFromDrawer = async (rowId: string, patchData: Record<string, any>) => {
    try {
      await updateRowFromDrawer(rowId, patchData);
    } catch (error) {
      console.error('Failed to update row:', error);
      toast.error(t.grid.saveValueFailed.value);
      throw error;
    }
  };

  const saveRowAndCloseDrawer = async (rowId: string, patchData: Record<string, any>) => {
    await saveRowFromDrawer(rowId, patchData);
    closeRowDrawer();
  };

  const saveRowAndNext = async (rowId: string, patchData: Record<string, any>) => {
    await saveRowFromDrawer(rowId, patchData);
    const ids = displayRows.map(r => r.id);
    const idx = ids.indexOf(rowId);
    const nextId = idx >= 0 ? ids[idx + 1] : null;
    if (nextId) {
      setRowDrawerRowId(nextId);
      setRowDrawerMode('edit');
      setRowDrawerOpen(true);
    } else {
      toast((t as any).toasts.noMoreRows.value);
    }
  };

  const requestDeleteRowFromGrid = (rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (row) {
      setDeleteRowTarget(row);
      setDeleteRowModalOpen(true);
    }
  };

  const deleteRow = async () => {
    if (!tableId || !deleteRowTarget) return;
    if (deleteRowTarget.id?.startsWith('temp-')) {
      setRows(prev => prev.filter(r => r.id !== deleteRowTarget.id));
      setSelectedRowIds(prev => prev.filter(id => id !== deleteRowTarget.id));
      setDeleteRowModalOpen(false);
      setDeleteRowTarget(null);
      toast.success(t.deleteRow.success.value);
      refreshStats();
      return;
    }
    const toastId = toast.loading(t.deleteRow.loading.value);
    try {
      await apiClient.delete(`/custom-tables/${tableId}/rows/${deleteRowTarget.id}`);
      toast.success(t.deleteRow.success.value, { id: toastId });
      setRows(prev => prev.filter(r => r.id !== deleteRowTarget.id));
      setSelectedRowIds(prev => prev.filter(id => id !== deleteRowTarget.id));
      setDeleteRowModalOpen(false);
      setDeleteRowTarget(null);
      refreshStats();
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 404 || status === 410) {
        toast.success(t.deleteRow.success.value, { id: toastId });
        setRows(prev => prev.filter(r => r.id !== deleteRowTarget.id));
        setSelectedRowIds(prev => prev.filter(id => id !== deleteRowTarget.id));
        setDeleteRowModalOpen(false);
        setDeleteRowTarget(null);
        refreshStats();
        return;
      }
      console.error('Failed to delete row:', error);
      toast.error(t.deleteRow.failed.value, { id: toastId });
    }
  };

  const openBulkDelete = () => {
    if (!selectedRowIds.length) return;
    setBulkDeleteRowIds(selectedRowIds);
    setBulkDeleteModalOpen(true);
  };

  const deleteSelectedRows = async () => {
    if (!tableId) return;
    const ids = bulkDeleteRowIds.length ? bulkDeleteRowIds : selectedRowIds;
    if (!ids.length) return;

    const toastId = toast.loading(t.bulkDeleteRows.loading.value);

    try {
      const tempIds = ids.filter(id => id.startsWith('temp-'));
      if (tempIds.length) {
        setRows(prev => prev.filter(row => !tempIds.includes(row.id)));
      }
      const results = await Promise.allSettled(
        ids
          .filter(id => !id.startsWith('temp-'))
          .map(rowId => apiClient.delete(`/custom-tables/${tableId}/rows/${rowId}`)),
      );
      const succeededIds: string[] = [];
      const failedIds: string[] = [];
      const realIds = ids.filter(id => !id.startsWith('temp-'));
      results.forEach((result, index) => {
        const rowId = realIds[index];
        if (result.status === 'fulfilled') {
          succeededIds.push(rowId);
          return;
        }
        const status = (result as any)?.reason?.response?.status;
        if (status === 404 || status === 410) {
          succeededIds.push(rowId);
          return;
        }
        failedIds.push(rowId);
      });

      if (succeededIds.length) {
        const succeededSet = new Set(succeededIds);
        setRows(prev => prev.filter(row => !succeededSet.has(row.id)));
      }
      setSelectedRowIds(failedIds.filter(id => !id.startsWith('temp-')));

      if (failedIds.length) {
        toast.error(t.bulkDeleteRows.failed.value, { id: toastId });
      } else {
        toast.success(t.bulkDeleteRows.success.value, { id: toastId });
      }
      refreshStats();
    } catch (error) {
      console.error('Failed to bulk delete rows:', error);
      toast.error(t.bulkDeleteRows.failed.value, { id: toastId });
    } finally {
      setBulkDeleteModalOpen(false);
      setBulkDeleteRowIds([]);
    }
  };

  const ensurePaidStatusColumnKey = async (): Promise<string> => {
    const existing = paidColKey;
    if (existing) return existing;
    if (!tableId) throw new Error('Missing tableId');

    const toastId = toast.loading((t as any).toasts.creatingPaidColumn.value);
    try {
      const response = await apiClient.post(`/custom-tables/${tableId}/columns`, {
        title: (t as any).paidColumn.value,
        type: 'boolean',
        config: { icon: 'mdi:check-circle-outline' },
      });
      const created = response.data?.data || response.data;
      if (!created || typeof created.key !== 'string') {
        throw new Error('Invalid create column response');
      }
      setTable(prev => (prev ? { ...prev, columns: [...(prev.columns || []), created] } : prev));
      toast.success((t as any).toasts.paidColumnCreated.value, { id: toastId });
      return created.key;
    } catch (error) {
      console.error('Failed to create Paid column:', error);
      toast.error((t as any).toasts.paidColumnCreateFailed.value, {
        id: toastId,
      });
      throw error;
    }
  };

  const classifyPaidStatuses = async (rowIds: string[]): Promise<Map<string, boolean | null>> => {
    if (!tableId || !rowIds.length) return new Map();
    try {
      const response = await apiClient.post(`/custom-tables/${tableId}/rows/paid-classify`, {
        rowIds,
      });
      const payload =
        response.data?.items ||
        response.data?.data?.items ||
        response.data?.data ||
        response.data ||
        [];
      const items = Array.isArray(payload) ? payload : [];
      const map = new Map<string, boolean | null>();
      items.forEach((item: any) => {
        const id = item?.rowId || item?.id;
        if (typeof id !== 'string') return;
        const paid = typeof item?.paid === 'boolean' ? (item.paid as boolean) : null;
        map.set(id, paid);
      });
      return map;
    } catch (error) {
      console.error('Failed to classify paid status:', error);
      return new Map();
    }
  };

  const markSelectedRowsPaid = async (paid: boolean) => {
    if (!tableId) return;
    const ids = [...selectedRowIds];
    if (!ids.length) return;
    if (bulkMarking) return;

    setBulkMarking(paid ? 'paid' : 'unpaid');
    const toastId = toast.loading(
      paid ? (t as any).actions.markingPaid.value : (t as any).actions.markingUnpaid.value,
    );

    try {
      const paidColKey = await ensurePaidStatusColumnKey();
      const predictions = await classifyPaidStatuses(ids);
      const updates = ids.map(rowId => {
        const predicted = predictions.get(rowId);
        const value = predicted === null || predicted === undefined ? paid : predicted;
        return { rowId, value };
      });

      const results = await Promise.allSettled(
        updates.map(update =>
          apiClient.patch(`/custom-tables/${tableId}/rows/${update.rowId}`, {
            data: { [paidColKey]: update.value },
          }),
        ),
      );

      const failedIds: string[] = [];
      const succeededMap = new Map<string, boolean>();
      results.forEach((result, index) => {
        const update = updates[index];
        if (result.status === 'fulfilled') {
          succeededMap.set(update.rowId, update.value);
        } else {
          failedIds.push(update.rowId);
        }
      });

      if (succeededMap.size) {
        setRows(prev =>
          prev.map(row => {
            if (!succeededMap.has(row.id)) return row;
            return {
              ...row,
              data: {
                ...(row.data || {}),
                [paidColKey]: succeededMap.get(row.id) as boolean,
              },
            };
          }),
        );
      }

      setSelectedRowIds(failedIds);

      if (failedIds.length) {
        toast.error((t as any).toasts.updateSomeRowsFailed.value, {
          id: toastId,
        });
      } else {
        toast.success(
          paid ? (t as any).toasts.markedPaid.value : (t as any).toasts.markedUnpaid.value,
          { id: toastId },
        );
      }

      refreshStats();
    } catch (error) {
      console.error('Failed to mark rows:', error);
      toast.error((t as any).toasts.updateRowsFailed.value, { id: toastId });
    } finally {
      setBulkMarking(null);
    }
  };

  const renameColumnTitleFromGrid = async (columnKey: string, nextTitle: string) => {
    if (!tableId) return;
    const colId = orderedColumns.find(c => c.key === columnKey)?.id;
    if (!colId) return;
    try {
      await apiClient.patch(`/custom-tables/${tableId}/columns/${colId}`, {
        title: nextTitle,
      });
      await loadTable();
      toast.success(t.renameColumn.success.value);
    } catch (error) {
      console.error('Failed to rename column:', error);
      toast.error(t.renameColumn.failed.value);
    }
  };

  const openDeleteColumn = (column: CustomTableColumn) => {
    setDeleteColumnTarget(column);
    setDeleteColumnModalOpen(true);
  };

  const deleteColumn = async () => {
    if (!tableId || !deleteColumnTarget) return;
    const toastId = toast.loading(t.deleteColumn.loading.value);
    try {
      await apiClient.delete(`/custom-tables/${tableId}/columns/${deleteColumnTarget.id}`);
      toast.success(t.deleteColumn.success.value, { id: toastId });
      setDeleteColumnModalOpen(false);
      setDeleteColumnTarget(null);
      await loadTable();
    } catch (error) {
      console.error('Failed to delete column:', error);
      toast.error(t.deleteColumn.failed.value, { id: toastId });
    }
  };

  const createColumn = async () => {
    if (!tableId) return;
    const title = newColumn.title.trim();
    if (!title) return;
    const toastId = toast.loading(t.addColumn.loading.value);
    try {
      await apiClient.post(`/custom-tables/${tableId}/columns`, {
        title,
        type: newColumn.type,
      });
      toast.success(t.addColumn.success.value, { id: toastId });
      setNewColumnOpen(false);
      setNewColumn({ title: '', type: 'text' });
      await loadTable();
    } catch (error) {
      console.error('Failed to create column:', error);
      toast.error(t.addColumn.failed.value, { id: toastId });
    }
  };

  const toggleColumnHidden = (key: string) => {
    setHiddenColumnKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  };

  const moveColumn = (key: string, direction: 'up' | 'down') => {
    setColumnOrder(prev => {
      const order = prev.length ? [...prev] : orderedColumns.map(c => c.key);
      const index = order.indexOf(key);
      if (index === -1) return order;
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= order.length) return order;
      const next = [...order];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
  };

  const resetColumns = () => {
    setHiddenColumnKeys([]);
    setColumnOrder(orderedColumns.map(c => c.key));
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-500">
        {t.auth.loading}
      </div>
    );
  }
  if (!user || !table) {
    return (
      <div className="container-shared px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          {!user ? t.auth.loginRequired : t.errors.notFound}
        </div>
      </div>
    );
  }
  if (!mounted)
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-500">
        {t.auth.loading}
      </div>
    );

  return (
    <div
      className={
        isFullscreen
          ? 'h-screen w-screen overflow-hidden bg-white'
          : 'container-shared px-4 sm:px-6 lg:px-8 py-8'
      }
      style={isFullscreen ? { paddingTop: '150px' } : undefined}
    >
      <div
        className={
          isFullscreen
            ? 'fixed top-0 left-0 right-0 z-50 bg-white px-6 pt-5 pb-0 border-x border-t border-gray-200 rounded-t-xl'
            : 'mb-0 flex flex-col gap-0'
        }
      >
        {/* Row 1: Tabs */}
        <div className="flex items-center justify-between w-full border-b border-gray-100 px-2">
          <div className="flex items-center gap-8">
            {quickTabs.map(tab => {
              const isActive = activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTabId(tab.id);
                    setActiveTabFilter(tab.filter ?? null);
                    setStickyQuickTab(tab.id === 'all' ? null : tab);
                  }}
                  className={`pb-3 text-sm font-medium transition-all relative ${isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {tab.label}
                  {typeof tab.count === 'number' && (
                    <span
                      className={`ml-2 text-xs py-0.5 px-2 rounded-full ${isActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setActiveTabId(columnsTabId);
                setActiveTabFilter(null);
                setStickyQuickTab(null);
              }}
              className={`pb-3 text-sm font-medium transition-all relative ${
                activeTabId === columnsTabId ? 'text-primary' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {(t as any).actions.columns.value}
              {activeTabId === columnsTabId && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={() => router.push('/custom-tables')}
            className="hidden sm:inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>{t.nav.back.value}</span>
          </button>
        </div>

        {activeTabId !== columnsTabId && (
          <div className="flex items-center justify-between mt-4 w-full px-2 pb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => markSelectedRowsPaid(true)}
                disabled={selectedRowIds.length === 0 || bulkMarking !== null}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 text-xs font-medium transition-colors ${selectedRowIds.length > 0 && bulkMarking === null ? 'text-gray-600 hover:bg-gray-50 hover:text-green-600' : 'text-gray-400'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <CheckCircle
                  className={`h-4 w-4 ${selectedRowIds.length > 0 && bulkMarking === null ? 'text-green-500' : 'text-green-500/50'}`}
                />
                <span>
                  {bulkMarking === 'paid'
                    ? (t as any).actions.markingPaid.value
                    : (t as any).actions.markPaid.value}
                </span>
              </button>
              <button
                type="button"
                onClick={() => markSelectedRowsPaid(false)}
                disabled={selectedRowIds.length === 0 || bulkMarking !== null}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 text-xs font-medium transition-colors ${selectedRowIds.length > 0 && bulkMarking === null ? 'text-gray-600 hover:bg-gray-50 hover:text-red-500' : 'text-gray-400'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <XCircle
                  className={`h-4 w-4 ${selectedRowIds.length > 0 && bulkMarking === null ? 'text-red-500' : 'text-red-500/50'}`}
                />
                <span>
                  {bulkMarking === 'unpaid'
                    ? (t as any).actions.markingUnpaid.value
                    : (t as any).actions.markUnpaid.value}
                </span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <Printer className="h-4 w-4" />
                <span>{(t as any).actions.print.value}</span>
              </button>
              <button
                onClick={openBulkDelete}
                disabled={selectedRowIds.length === 0}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
                <span>{(t as any).actions.delete.value}</span>
              </button>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="relative group hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input
                  placeholder={(t as any).actions.searchPlaceholder.value}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm w-48 lg:w-80 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                />
              </div>
            </div>
          </div>
        )}

        {activeTabId === columnsTabId && (
          <div className="min-h-full w-full px-2 pb-10">
            <div className="mx-auto w-full max-w-lg space-y-6 py-10">
              <div className="space-y-3">
                {(columnOrder.length ? columnOrder : orderedColumns.map(c => c.key)).map(key => {
                  const col = orderedColumns.find(c => c.key === key);
                  if (!col) return null;
                  const isHidden = hiddenColumnKeys.includes(col.key);
                  return (
                    <label
                      key={col.key}
                      className={`flex items-center justify-between rounded-xl border px-5 py-4 text-base transition-colors ${
                        isHidden
                          ? 'border-gray-100 text-gray-400'
                          : 'border-gray-200 text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate font-medium">{col.title || col.key}</span>
                      <input
                        type="checkbox"
                        checked={!isHidden}
                        onChange={() => toggleColumnHidden(col.key)}
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/20"
                      />
                    </label>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={resetColumns}
                disabled={isColumnsDefault}
                className="w-full rounded-xl border border-primary bg-primary/10 px-5 py-4 text-sm font-semibold text-primary hover:bg-primary/15 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary/10"
              >
                {(t as any).actions.columnsReset.value}
              </button>
            </div>
          </div>
        )}

        <ModalShell
          isOpen={newColumnOpen}
          onClose={() => {
            setNewColumnOpen(false);
            setNewColumn({ title: '', type: 'text' });
          }}
          size="xl"
          className="rounded-2xl"
          title={(t as any).addColumn.modalTitle?.value ?? t.addColumn.titleLabel}
          footer={
            <div className="flex w-full items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setNewColumnOpen(false);
                  setNewColumn({ title: '', type: 'text' });
                }}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                {t.addColumn.cancel}
              </button>
              <button
                type="button"
                onClick={createColumn}
                disabled={!newColumn.title.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {t.addColumn.save}
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="md:col-span-4">
              <label
                className="block text-sm font-semibold text-gray-700 mb-2"
                htmlFor="new-column-title"
              >
                {t.addColumn.titleLabel}
              </label>
              <input
                id="new-column-title"
                value={newColumn.title}
                onChange={e => setNewColumn(prev => ({ ...prev, title: e.target.value }))}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    if (newColumn.title.trim()) createColumn();
                  }
                }}
                placeholder={t.addColumn.titlePlaceholder.value ?? ''}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition shadow-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label
                className="block text-sm font-semibold text-gray-700 mb-2"
                htmlFor="new-column-type"
              >
                {t.addColumn.typeLabel}
              </label>
              <select
                id="new-column-type"
                value={newColumn.type}
                onChange={e =>
                  setNewColumn(prev => ({
                    ...prev,
                    type: e.target.value as ColumnType,
                  }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition"
              >
                {columnTypes.map(typeItem => (
                  <option key={typeItem.value} value={typeItem.value}>
                    {typeItem.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </ModalShell>
      </div>

      <div className={isFullscreen ? 'h-full w-full pt-0' : 'mt-0'}>
        <div
          className={
            isFullscreen
              ? 'h-full w-full bg-white transition-all duration-300 max-w-[1920px] mx-auto'
              : 'rounded-xl border border-gray-200 bg-white'
          }
        >
          {activeTabId !== columnsTabId && (
            <CustomTableTanStack
              tableId={tableId as string}
              columns={displayColumns}
              rows={displayRows}
              selectedRowIds={selectedRowIds}
              columnWidths={gridColumnWidths}
              isFullscreen={isFullscreen}
              loadingRows={loadingRows}
              hasMore={hasMore}
              stickyLeftColumnIds={stickyLeftColumnIds}
              stickyRightColumnIds={stickyRightColumnIds}
              showAddRow={activeTabId === 'all'}
              onLoadMore={loadRows}
              onFiltersParamChange={onGridFiltersParamChange}
              onUpdateCell={updateCellFromGrid}
              onUpdateRowStyle={updateRowStyle}
              onCreateRow={createRow}
              onViewRow={rowId => openRowDrawer(rowId, 'view')}
              onEditRow={rowId => openRowDrawer(rowId, 'edit')}
              onDeleteRow={requestDeleteRowFromGrid}
              onPersistColumnWidth={persistColumnWidth}
              selectedColumnKeys={selectedColumnKeys}
              onSelectedColumnKeysChange={setSelectedColumnKeys}
              onRenameColumnTitle={renameColumnTitleFromGrid}
              onDeleteColumn={colKey => {
                const targetColumn = orderedColumns.find(c => c.key === colKey);
                if (targetColumn) openDeleteColumn(targetColumn);
              }}
              onSelectedRowIdsChange={setSelectedRowIds}
              onAddColumnClick={() => setNewColumnOpen(true)}
            />
          )}
        </div>
      </div>

      {activeTabId !== columnsTabId && (
        <div className="mt-4 flex items-center justify-center">
          <button
            onClick={() => loadRows()}
            disabled={!hasMore || loadingRows}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingRows ? t.grid.loadingMore : hasMore ? t.grid.loadMore : t.grid.noMore}
          </button>
        </div>
      )}

      <ModalShell
        isOpen={pastePreviewOpen}
        onClose={resetPastePreview}
        size="full"
        showCloseButton={!pasteApplying}
        closeOnBackdropClick={!pasteApplying}
        closeOnEscape={!pasteApplying}
        className="w-[95vw] max-w-none h-[90vh] rounded-2xl overflow-hidden"
        contentClassName="flex flex-col h-full p-0 gap-0"
        title={
          <div className="flex items-center gap-4">
            <span className="text-xl font-semibold tracking-tight text-gray-900">
              {pastePreview
                ? `${(t as any).paste.titlePrefix.value}${pastePreview.totalRows}${(t as any).paste.titleSuffix.value}`
                : (t as any).paste.titleFallback.value}
            </span>
            {pastePreview?.hasHeadersToggle && (
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer transition-colors bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                <input
                  type="checkbox"
                  checked={pasteUseHeaders}
                  onChange={event => handlePasteHeadersToggle(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                />
                <span>{(t as any).paste.headersToggle.value}</span>
              </label>
            )}
          </div>
        }
        footer={
          <ModalFooter
            onCancel={resetPastePreview}
            onConfirm={handlePasteAdd}
            cancelText={(t as any).paste.cancel.value}
            confirmText={(t as any).paste.add.value}
            isConfirmLoading={pasteApplying}
            isConfirmDisabled={
              pasteParsing ||
              !pastePreview?.dataRows.length ||
              Boolean(pastePreview?.hasErrors) ||
              hasMissingPasteColumnTitles
            }
          />
        }
      >
        {pasteParsing && (
          <div className="flex flex-1 items-center justify-center gap-3 text-sm text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>{(t as any).paste.parsing.value}</span>
          </div>
        )}
        {!pasteParsing && pastePreview && (
          <div className="flex flex-col h-full">
            {pastePreview.hasErrors && (
              <div className="flex-none px-6 py-3 border-b border-gray-100 bg-white">
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
                  <div className="font-semibold whitespace-nowrap text-xs uppercase tracking-wide opacity-80 pt-0.5">
                    {(t as any).paste.errorsTitle.value}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-amber-700">
                    {(['date', 'amount', 'currency', 'paid'] as PasteErrorKey[])
                      .filter(key => pastePreview.errors[key] > 0)
                      .map(key => (
                        <span
                          key={key}
                          className="flex items-center gap-1 bg-amber-100/50 px-2 py-0.5 rounded text-xs font-medium"
                        >
                          <span>{(t as any).paste.errors[key].value}:</span>
                          <span className="font-mono font-bold">{pastePreview.errors[key]}</span>
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 relative bg-gray-50/30">
              {pastePreview.totalRows === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  {(t as any).paste.noRows.value}
                </div>
              ) : (
                <div className="absolute inset-0 overflow-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
                      <tr>
                        {pastePreview.columns.map(col => (
                          <th
                            key={`${col.field}-${col.columnKey}`}
                            className="px-3 py-3 text-left min-w-[180px] border-r border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500"
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                      {pastePreview.previewRows.map(row => (
                        <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                          {row.cells.map((cell, index) => (
                            <td
                              key={`${row.id}-${index}`}
                              className={`px-3 py-2 text-sm border-r border-gray-50 transition-colors ${
                                cell.error ? 'bg-red-50 text-red-700' : 'text-gray-700'
                              }`}
                            >
                              {cell.sourceIndex !== null ? (
                                <input
                                  value={cell.value}
                                  onChange={event =>
                                    handlePasteCellChange(
                                      row.rowIndex,
                                      cell.sourceIndex as number,
                                      event.target.value,
                                    )
                                  }
                                  className={`w-full bg-transparent border-none p-0 focus:ring-0 text-sm ${
                                    cell.error
                                      ? 'text-red-700 placeholder:text-red-400'
                                      : 'text-gray-900'
                                  }`}
                                />
                              ) : (
                                <div className="truncate">{cell.value || '—'}</div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {pastePreview.extraRowsCount > 0 && (
                        <tr>
                          <td
                            colSpan={pastePreview.columns.length}
                            className="py-6 text-center text-xs text-gray-400 bg-gray-50/30"
                          >
                            {(t as any).paste.moreRowsPrefix.value}
                            <span className="font-semibold text-gray-600 mx-1">
                              {pastePreview.extraRowsCount}
                            </span>
                            {(t as any).paste.moreRowsSuffix.value}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </ModalShell>

      <RowDrawer
        open={rowDrawerOpen}
        mode={rowDrawerMode}
        row={drawerRow}
        columns={orderedColumns}
        onClose={closeRowDrawer}
        onModeChange={setRowDrawerMode}
        onSave={saveRowFromDrawer}
        onSaveAndClose={saveRowAndCloseDrawer}
        onSaveAndNext={saveRowAndNext}
      />

      <ConfirmModal
        isOpen={deleteColumnModalOpen}
        onClose={() => {
          setDeleteColumnModalOpen(false);
          setDeleteColumnTarget(null);
        }}
        onConfirm={deleteColumn}
        title={t.deleteColumn.confirmTitle.value}
        message={
          deleteColumnTarget
            ? `${t.deleteColumn.confirmWithNamePrefix.value}${deleteColumnTarget.title}${t.deleteColumn.confirmWithNameSuffix.value}`
            : t.deleteColumn.confirmNoName.value
        }
        confirmText={t.deleteColumn.confirm.value}
        cancelText={(t as any).deleteColumn.cancel.value}
        isDestructive
      />

      <ConfirmModal
        isOpen={bulkDeleteModalOpen}
        onClose={() => {
          setBulkDeleteModalOpen(false);
          setBulkDeleteRowIds([]);
        }}
        onConfirm={deleteSelectedRows}
        title={(t as any).bulkDeleteRows.confirmTitle.value}
        message={`${(t as any).bulkDeleteRows.confirmMessagePrefix.value}${(
          bulkDeleteRowIds.length || selectedRowIds.length
        ).toString()}${(t as any).bulkDeleteRows.confirmMessageSuffix.value}`}
        confirmText={(t as any).bulkDeleteRows.confirm.value}
        cancelText={(t as any).bulkDeleteRows.cancel.value}
        isDestructive
      />

      <ConfirmModal
        isOpen={deleteRowModalOpen}
        onClose={() => {
          setDeleteRowModalOpen(false);
          setDeleteRowTarget(null);
        }}
        onConfirm={deleteRow}
        title={(t as any).deleteRow.confirmTitle.value}
        message={
          deleteRowTarget
            ? `${(t as any).deleteRow.confirmWithNumberPrefix.value}${deleteRowTarget?.rowNumber ?? ''}${(t as any).deleteRow.confirmWithNumberSuffix.value}`
            : (t as any).deleteRow.confirmNoNumber.value
        }
        confirmText={(t as any).deleteRow.confirm.value}
        cancelText={(t as any).deleteRow.cancel.value}
        isDestructive
      />
    </div>
  );
}
