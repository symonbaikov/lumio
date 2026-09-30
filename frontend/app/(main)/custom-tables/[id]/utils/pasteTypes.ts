import type { ColumnType, CustomTableColumnConfig } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PasteFieldKey = 'date' | 'type' | 'amount' | 'currency' | 'comment' | 'paid';

export type PasteErrorKey = 'date' | 'amount' | 'currency' | 'paid';

export type PasteColumnMapping = {
  sourceIndex: number | null;
  field: PasteFieldKey;
  columnKey: string | null;
  label: string;
  options?: string[];
  mode: 'existing' | 'new';
  newTitle?: string;
  newType?: ColumnType;
};

export type PasteSourceColumn = {
  index: number;
  header: string;
  sampleValues: string[];
};

export type PasteMappingSelection = {
  mode: 'ignore' | 'existing' | 'new';
  columnKey?: string;
  field?: PasteFieldKey | null;
  newTitle?: string;
  newType?: ColumnType;
};

export type PastePreviewCell = {
  value: string;
  error: boolean;
  sourceIndex: number | null;
};

export type PastePreviewRow = {
  id: number;
  rowIndex: number;
  cells: PastePreviewCell[];
};

export type PastePreviewData = {
  totalRows: number;
  previewRows: PastePreviewRow[];
  dataRows: import('./types').CustomTableRowPatch[];
  columns: PasteColumnMapping[];
  errors: Record<PasteErrorKey, number>;
  hasErrors: boolean;
  extraRowsCount: number;
  hasHeadersToggle: boolean;
  headersDetected: boolean;
};

/** Minimal column shape required by paste helpers. */
export interface PasteColumn {
  key: string;
  title?: string | null;
  type?: ColumnType | string | null;
  config?: CustomTableColumnConfig | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PASTE_FIELD_ALIASES: Record<PasteFieldKey, string[]> = {
  date: ['date', 'дата', 'день', 'day', 'dt', 'дт'],
  type: ['type', 'тип', 'category', 'категория', 'вид', 'account', 'операция'],
  amount: ['amount', 'sum', 'сумма', 'итого', 'total', 'value', 'стоимость'],
  currency: ['currency', 'валюта', 'curr', 'вал', 'code'],
  comment: ['comment', 'комментар', 'note', 'memo', 'описан', 'details', 'description'],
  paid: ['paid', 'оплач', 'оплата', 'неоплач', 'payment', 'status'],
};
