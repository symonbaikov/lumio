import type { ParsedTransaction } from '../../parsing/interfaces/parsed-statement.interface';
import type { SheetColumnRole } from './column-roles';
import { parseSheetAmount } from './parse-amount.util';
import { parseSheetDate } from './parse-date.util';

export type SheetRowIssue =
  | 'invalid_date'
  | 'invalid_amount'
  | 'zero_amount'
  | 'missing_required'
  | 'duplicate_in_file'
  | 'unknown_currency';

export interface MappedSheetRow {
  rowNumber: number;
  status: 'ok' | 'invalid' | 'skipped';
  issues: SheetRowIssue[];
  transaction?: ParsedTransaction;
  raw: Array<string | null>;
}

export interface SheetMapping {
  roles: SheetColumnRole[];
  defaultCurrency: string;
  dateFormat?: 'auto' | 'dmy' | 'mdy';
  skipRowNumbers?: number[];
  /** When true a bare positive amount in an `amount` column means expense, not income. */
  invertSign?: boolean;
}

/** Looks up a cell by role for a single row, given a precomputed role→column index map. */
type CellGetter = (role: SheetColumnRole) => unknown;

const ISO_CURRENCY_RE = /^[A-Za-z]{3}$/;

/** Renders a cell as trimmed text; empty/nullish cells become `''`. */
const cellText = (raw: unknown): string => {
  if (raw === null || raw === undefined) {
    return '';
  }
  return String(raw).trim();
};

const toRaw = (row: unknown[]): Array<string | null> =>
  row.map(cell => {
    const text = cellText(cell);
    return text === '' ? null : text;
  });

/**
 * A role's column is its first occurrence in `roles` — this is also the sane
 * default for a hand-constructed mapping with duplicate role entries.
 */
const buildCellGetter = (row: unknown[], roles: SheetColumnRole[]): CellGetter => {
  return role => {
    const idx = roles.indexOf(role);
    return idx >= 0 ? row[idx] : undefined;
  };
};

interface AmountResolution {
  debit?: number;
  credit?: number;
  issue?: 'invalid_amount' | 'zero_amount';
}

/** Rule 4, separate debit/credit columns branch. */
const resolveDebitCreditAmount = (getCell: CellGetter): AmountResolution => {
  const debitVal = parseSheetAmount(getCell('debit'));
  const creditVal = parseSheetAmount(getCell('credit'));
  const debitNonZero = debitVal !== null && debitVal !== 0;
  const creditNonZero = creditVal !== null && creditVal !== 0;

  if (debitNonZero && creditNonZero) {
    return { issue: 'invalid_amount' };
  }
  if (debitNonZero) {
    return { debit: Math.abs(debitVal as number) };
  }
  if (creditNonZero) {
    return { credit: Math.abs(creditVal as number) };
  }
  // Neither column carries a genuine non-zero value — this covers both
  // "both empty/unparseable" and "both literally 0" cases. Treated as
  // zero_amount rather than invalid_amount: an empty or garbled debit/credit
  // pair reads as "no movement recorded", not as data worth rejecting
  // outright, matching the spirit of the signed-amount branch's "parses to
  // 0" case.
  return { issue: 'zero_amount' };
};

/** Rule 4, single signed `amount` column branch. */
const resolveSignedAmount = (
  getCell: CellGetter,
  invertSign: boolean | undefined,
): AmountResolution => {
  const amountVal = parseSheetAmount(getCell('amount'));
  if (amountVal === null) {
    return { issue: 'invalid_amount' };
  }
  if (amountVal === 0) {
    return { issue: 'zero_amount' };
  }
  const isExpense = invertSign ? amountVal > 0 : amountVal < 0;
  return isExpense ? { debit: Math.abs(amountVal) } : { credit: Math.abs(amountVal) };
};

/** Rule 4: resolves debit/credit from either separate columns or a signed amount column. */
const resolveAmount = (
  getCell: CellGetter,
  hasDebitCreditRoles: boolean,
  invertSign: boolean | undefined,
): AmountResolution =>
  hasDebitCreditRoles
    ? resolveDebitCreditAmount(getCell)
    : resolveSignedAmount(getCell, invertSign);

/** Rule 5: paymentPurpose falls back to counterparty, counterpartyName falls back to description. */
const resolveDescriptionAndCounterparty = (
  getCell: CellGetter,
): { paymentPurpose: string; counterpartyName: string } => {
  const descText = cellText(getCell('description'));
  const counterpartyText = cellText(getCell('counterparty'));
  return {
    paymentPurpose: descText || counterpartyText || '',
    counterpartyName: counterpartyText || descText || '—',
  };
};

/** Rule 6: currency cell must be a real 3-letter ISO code, else fall back with an issue. */
const resolveCurrency = (
  getCell: CellGetter,
  defaultCurrency: string,
): { currency: string; issue?: 'unknown_currency' } => {
  const currencyText = cellText(getCell('currency'));
  if (currencyText === '') {
    return { currency: defaultCurrency };
  }
  if (ISO_CURRENCY_RE.test(currencyText)) {
    return { currency: currencyText.toUpperCase() };
  }
  return { currency: defaultCurrency, issue: 'unknown_currency' };
};

/** Maps a single data row per rules 2-6; rule 7 (dedup) is applied afterwards across all rows. */
const mapRow = (
  row: unknown[],
  rowNumber: number,
  mapping: SheetMapping,
  hasDebitCreditRoles: boolean,
): MappedSheetRow => {
  const raw = toRaw(row);

  if (mapping.skipRowNumbers?.includes(rowNumber)) {
    return { rowNumber, status: 'skipped', issues: [], raw };
  }
  if (row.every(cell => cellText(cell) === '')) {
    return { rowNumber, status: 'skipped', issues: [], raw };
  }

  const getCell = buildCellGetter(row, mapping.roles);

  const transactionDate = parseSheetDate(getCell('date'));
  if (!transactionDate) {
    return { rowNumber, status: 'invalid', issues: ['invalid_date'], raw };
  }

  const amount = resolveAmount(getCell, hasDebitCreditRoles, mapping.invertSign);
  if (amount.issue) {
    return { rowNumber, status: 'invalid', issues: [amount.issue], raw };
  }

  const { paymentPurpose, counterpartyName } = resolveDescriptionAndCounterparty(getCell);
  const issues: SheetRowIssue[] = [];
  const { currency, issue: currencyIssue } = resolveCurrency(getCell, mapping.defaultCurrency);
  if (currencyIssue) {
    issues.push(currencyIssue);
  }

  const transaction: ParsedTransaction = {
    transactionDate,
    counterpartyName,
    debit: amount.debit,
    credit: amount.credit,
    paymentPurpose,
    currency,
  };

  return { rowNumber, status: 'ok', issues, transaction, raw };
};

/**
 * Marks in-file duplicate `ok` rows as invalid, in place. A row's dedup key
 * is `date|debit|credit|counterpartyName|currency` (rule 7) — deliberately
 * excludes the description/paymentPurpose. Skipped and already-invalid rows
 * never entered the candidate pool and can't collide.
 */
const flagDuplicates = (rows: MappedSheetRow[]): void => {
  const seenKeys = new Set<string>();
  for (const row of rows) {
    if (row.status !== 'ok' || !row.transaction) {
      continue;
    }
    const t = row.transaction;
    const key = `${t.transactionDate.toISOString()}|${t.debit ?? ''}|${t.credit ?? ''}|${t.counterpartyName}|${t.currency ?? ''}`;
    if (seenKeys.has(key)) {
      row.status = 'invalid';
      row.issues = ['duplicate_in_file'];
      row.transaction = undefined;
    } else {
      seenKeys.add(key);
    }
  }
};

const summarize = (rows: MappedSheetRow[]): { ok: number; invalid: number; skipped: number } => {
  const summary = { ok: 0, invalid: 0, skipped: 0 };
  for (const row of rows) {
    summary[row.status] += 1;
  }
  return summary;
};

/**
 * Maps raw spreadsheet rows to `ParsedTransaction` candidates, applying
 * these rules in order per row (never throws — a malformed row degrades to
 * `status: 'invalid'` instead of failing the whole import):
 *
 * 1. `rowNumber` in `skipRowNumbers` → `skipped`.
 * 2. Every cell empty → `skipped`.
 * 3. Unparseable/missing `date` → `invalid: ['invalid_date']`.
 * 4. Amount: separate `debit`/`credit` columns take whichever parses
 *    non-zero (both non-zero → `invalid_amount`; neither → `zero_amount`);
 *    otherwise the signed `amount` column (`< 0` → debit, `> 0` → credit,
 *    flipped by `invertSign`; unparseable → `invalid_amount`; `0` →
 *    `zero_amount`).
 * 5. `paymentPurpose` = description, else counterparty, else `''`.
 *    `counterpartyName` = counterparty, else description, else `'—'`.
 * 6. `currency` = the currency cell uppercased if it's a 3-letter ISO code,
 *    else `defaultCurrency` (non-ISO non-empty cell adds `unknown_currency`).
 * 7. In-file dedup on `date|debit|credit|counterpartyName|currency`; a
 *    repeat is flagged `invalid: ['duplicate_in_file']`.
 */
export const mapSheetRows = (
  values: unknown[][],
  mapping: SheetMapping,
): { rows: MappedSheetRow[]; summary: { ok: number; invalid: number; skipped: number } } => {
  const hasDebitCreditRoles = mapping.roles.includes('debit') || mapping.roles.includes('credit');

  const rows = values.map((row, i) => mapRow(row, i + 1, mapping, hasDebitCreditRoles));

  flagDuplicates(rows);

  return { rows, summary: summarize(rows) };
};
