import apiClient from '@/app/lib/api';
import type {
  CustomTableGridRow,
  CustomTableRowPatch,
  CustomTableRowStyles,
} from '../utils/stylingUtils';
import { getCreatedRowResponse } from '../utils/tableHelpers';
import { isDraftRowId } from './draftRowHelpers';

export function applyRowDataPatch(
  rows: CustomTableGridRow[],
  rowId: string,
  patch: CustomTableRowPatch,
): CustomTableGridRow[] {
  return rows.map(r => (r.id === rowId ? { ...r, data: { ...(r.data || {}), ...patch } } : r));
}

export function applyRowStylePatch(
  rows: CustomTableGridRow[],
  rowId: string,
  styles: CustomTableRowStyles,
): CustomTableGridRow[] {
  return rows.map(r => (r.id === rowId ? { ...r, styles } : r));
}

export function hasPaidColChange(
  paidColKey: string | null,
  patchData: CustomTableRowPatch,
): boolean {
  return Boolean(paidColKey && Object.hasOwn(patchData, paidColKey));
}

function extractPayload(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }
  const d = data as Record<string, unknown>;
  // У самой строки есть поле data со значениями ячеек, поэтому конверт можно
  // разворачивать только тогда, когда снаружи лежит не строка. Иначе вместо
  // строки разбирались её же ячейки, id терялся и подставлялся временный.
  if (typeof d.id === 'string' || typeof d.rowNumber === 'number') {
    return data;
  }
  return d.data ?? d.item ?? data;
}

export function parseCreateRowResponse(data: unknown, rowCount: number): CustomTableGridRow | null {
  const payload = extractPayload(data);
  const raw = Array.isArray(payload) ? payload[0] : payload;
  const created = getCreatedRowResponse(raw);
  // Без серверного id строка осталась бы черновиком: getCreatedRowResponse
  // подставляет временный id, и молча сохранять такую строку нельзя.
  if (!created || isDraftRowId(created.id)) {
    return null;
  }
  created.rowNumber = created.rowNumber || rowCount + 1;
  return created;
}

/**
 * Данные строки из ответа PATCH/POST: сервер возвращает их вместе с
 * посчитанными формулами, поэтому грид берёт их вместо локальной правки.
 */
export function extractRowData(data: unknown): CustomTableRowPatch {
  const payload = extractPayload(data);
  const raw = (Array.isArray(payload) ? payload[0] : payload) as { data?: unknown } | null;
  return raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object'
    ? (raw.data as CustomTableRowPatch)
    : {};
}

export async function createRowRequest(
  tableId: string,
  rowCount: number,
  data: CustomTableRowPatch,
): Promise<CustomTableGridRow> {
  const response = await apiClient.post(`/custom-tables/${tableId}/rows`, { data });
  const created = parseCreateRowResponse(response.data, rowCount);
  if (!created) {
    throw new Error('Invalid create row response');
  }
  return created;
}

export interface UpdateCellRequestParams {
  tableId: string;
  rowId: string;
  columnKey: string;
  value: unknown;
}
export async function updateCellRequest({
  tableId,
  rowId,
  columnKey,
  value,
}: UpdateCellRequestParams): Promise<void> {
  await apiClient.patch(`/custom-tables/${tableId}/rows/${rowId}`, {
    data: { [columnKey]: value },
  });
}

export async function updateRowPatchRequest(
  tableId: string,
  rowId: string,
  patchData: CustomTableRowPatch,
): Promise<void> {
  await apiClient.patch(`/custom-tables/${tableId}/rows/${rowId}`, { data: patchData });
}

export interface PersistRowStyleParams {
  tableId: string;
  rowId: string;
  rows: CustomTableGridRow[];
  styles: CustomTableRowStyles;
}

export async function persistRowStyle({
  tableId,
  rowId,
  rows,
  styles,
}: PersistRowStyleParams): Promise<CustomTableRowStyles> {
  const row = rows.find(r => r.id === rowId);
  const mergedStyles = { ...(row?.styles || {}), ...styles };
  await apiClient.patch(`/custom-tables/${tableId}/rows/${rowId}`, {
    data: row?.data || {},
    styles: mergedStyles,
  });
  return mergedStyles;
}
