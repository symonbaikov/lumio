import { GoogleSheetsImportLayoutType } from '../../custom-tables/dto/google-sheets-import-preview.dto';

const normalizeCellValue = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
};

const isDateLike = (value: string): boolean => {
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return true;
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(v)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) return true;
  return false;
};

/**
 * Detects whether a sheet is laid out as a flat transaction list or a
 * matrix (wide, date-header-per-column pivot table). Moved verbatim from
 * `CustomTablesImportService.detectLayout` so `SheetTransactionImportService`
 * can reuse it without duplicating the heuristic.
 */
export const detectLayout = (
  values: unknown[][],
  headerRowIndex: number,
): GoogleSheetsImportLayoutType => {
  const header = (values[headerRowIndex] || [])
    .map(v => normalizeCellValue(v))
    .filter(Boolean) as string[];
  const data = values.slice(headerRowIndex + 1, headerRowIndex + 1 + 20);

  const headerDateLikeCount = header.filter(v => isDateLike(v)).length;
  const wide = header.length >= 12;

  let firstColNonEmpty = 0;
  for (const row of data) {
    const first = normalizeCellValue(row?.[0]);
    if (first) firstColNonEmpty += 1;
  }

  if (
    wide &&
    headerDateLikeCount >= Math.max(5, Math.floor(header.length * 0.4)) &&
    firstColNonEmpty >= 8
  ) {
    return GoogleSheetsImportLayoutType.MATRIX;
  }

  return GoogleSheetsImportLayoutType.FLAT;
};
