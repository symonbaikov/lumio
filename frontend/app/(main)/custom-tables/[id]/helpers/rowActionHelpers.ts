import apiClient from '@/app/lib/api';
import type {
  CustomTableGridRow,
  CustomTableRowPatch,
  CustomTableRowStyles,
} from '../utils/stylingUtils';
import { getCreatedRowResponse } from '../utils/tableHelpers';

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
  return d.data ?? d.item ?? data;
}

export function parseCreateRowResponse(data: unknown, rowCount: number): CustomTableGridRow | null {
  const payload = extractPayload(data);
  const raw = Array.isArray(payload) ? payload[0] : payload;
  const created = getCreatedRowResponse(raw);
  if (!created) {
    return null;
  }
  created.rowNumber = created.rowNumber || rowCount + 1;
  return created;
}

export async function createRowRequest(
  tableId: string,
  rowCount: number,
): Promise<CustomTableGridRow> {
  const response = await apiClient.post(`/custom-tables/${tableId}/rows`, { data: {} });
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
