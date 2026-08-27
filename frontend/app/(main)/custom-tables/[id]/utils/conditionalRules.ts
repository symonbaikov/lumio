import type { CustomTableGridRow, SheetStyle } from './stylingUtils';

export type ConditionalOp =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'isEmpty'
  | 'isNotEmpty';

export interface ConditionalRule {
  id: string;
  /** Колонка, значение которой проверяется. */
  col: string;
  op: ConditionalOp;
  value?: string;
  /** Куда красим: только эту ячейку или всю строку. */
  target: 'cell' | 'row';
  style: { backgroundColor?: string; color?: string; bold?: boolean };
}

function toNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  const num = Number(String(raw).replace(',', '.').trim());
  return Number.isFinite(num) ? num : null;
}

function isEmptyValue(raw: unknown): boolean {
  if (raw === null || raw === undefined) {
    return true;
  }
  if (Array.isArray(raw)) {
    return raw.length === 0;
  }
  return String(raw).trim() === '';
}

export function matchesRule(rule: ConditionalRule, cellValue: unknown): boolean {
  if (rule.op === 'isEmpty') {
    return isEmptyValue(cellValue);
  }
  if (rule.op === 'isNotEmpty') {
    return !isEmptyValue(cellValue);
  }

  const expected = rule.value ?? '';
  if (rule.op === 'gt' || rule.op === 'gte' || rule.op === 'lt' || rule.op === 'lte') {
    const left = toNumber(cellValue);
    const right = toNumber(expected);
    // Сравнивать нечисловое с числом бессмысленно — правило просто не срабатывает.
    if (left === null || right === null) {
      return false;
    }
    if (rule.op === 'gt') {
      return left > right;
    }
    if (rule.op === 'gte') {
      return left >= right;
    }
    if (rule.op === 'lt') {
      return left < right;
    }
    return left <= right;
  }

  const actual = isEmptyValue(cellValue) ? '' : String(cellValue);
  if (rule.op === 'contains') {
    return actual.toLowerCase().includes(expected.toLowerCase());
  }
  if (rule.op === 'neq') {
    return actual !== expected;
  }
  return actual === expected;
}

function toSheetStyle(style: ConditionalRule['style']): SheetStyle {
  const result: SheetStyle = {};
  if (style.backgroundColor) {
    result.backgroundColor = style.backgroundColor;
  }
  if (style.color || style.bold) {
    result.textFormat = {
      ...(style.color ? { foregroundColor: style.color } : {}),
      ...(style.bold ? { bold: true } : {}),
    };
  }
  return result;
}

/**
 * Стиль от сработавших правил для конкретной ячейки. Возвращает SheetStyle,
 * а не готовый CSS, чтобы результат смешивался с ручными стилями обычным
 * путём — правило и заливка руками не должны конфликтовать по формату.
 *
 * Правила применяются по порядку: последнее сработавшее перекрывает прежние.
 */
export function conditionalStyleFor(
  rules: ConditionalRule[],
  row: CustomTableGridRow,
  columnKey: string,
): SheetStyle | undefined {
  if (!rules.length) {
    return undefined;
  }
  let merged: SheetStyle | undefined;

  for (const rule of rules) {
    // Правило на строку красит все ячейки, правило на ячейку — только свою.
    if (rule.target === 'cell' && rule.col !== columnKey) {
      continue;
    }
    if (!matchesRule(rule, row.data?.[rule.col])) {
      continue;
    }
    const style = toSheetStyle(rule.style);
    merged = {
      ...(merged ?? {}),
      ...style,
      ...(style.textFormat || merged?.textFormat
        ? { textFormat: { ...(merged?.textFormat ?? {}), ...(style.textFormat ?? {}) } }
        : {}),
    };
  }

  return merged;
}
