import type { SheetColumnRole } from './column-roles';
import { parseSheetAmount } from './parse-amount.util';
import { parseSheetDate } from './parse-date.util';
import type { ParsedTransaction } from '../../parsing/interfaces/parsed-statement.interface';

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

export const mapSheetRows = (
  values: unknown[][],
  mapping: SheetMapping,
): { rows: MappedSheetRow[]; summary: { ok: number; invalid: number; skipped: number } } => {
  const { roles, defaultCurrency, invertSign, skipRowNumbers } = mapping;

  // A role's column is its first occurrence in `roles` — this is also the
  // sane default for a hand-constructed mapping with duplicate role entries.
  const indexOfRole = (role: SheetColumnRole): number => roles.indexOf(role);

  const hasDebitCreditRoles = roles.includes('debit') || roles.includes('credit');

  const rows: MappedSheetRow[] = values.map((row, i) => {
    const rowNumber = i + 1;
    const raw = toRaw(row);

    const getCell = (role: SheetColumnRole): unknown => {
      const idx = indexOfRole(role);
      return idx >= 0 ? row[idx] : undefined;
    };

    if (skipRowNumbers?.includes(rowNumber)) {
      return { rowNumber, status: 'skipped', issues: [], raw };
    }

    if (row.every(cell => cellText(cell) === '')) {
      return { rowNumber, status: 'skipped', issues: [], raw };
    }

    // Rule 3: date
    const transactionDate = parseSheetDate(getCell('date'));
    if (!transactionDate) {
      return { rowNumber, status: 'invalid', issues: ['invalid_date'], raw };
    }

    // Rule 4: amount
    let debit: number | undefined;
    let credit: number | undefined;

    if (hasDebitCreditRoles) {
      const debitVal = parseSheetAmount(getCell('debit'));
      const creditVal = parseSheetAmount(getCell('credit'));
      const debitNonZero = debitVal !== null && debitVal !== 0;
      const creditNonZero = creditVal !== null && creditVal !== 0;

      if (debitNonZero && creditNonZero) {
        return { rowNumber, status: 'invalid', issues: ['invalid_amount'], raw };
      }
      if (debitNonZero) {
        debit = Math.abs(debitVal as number);
      } else if (creditNonZero) {
        credit = Math.abs(creditVal as number);
      } else {
        // Neither column carries a genuine non-zero value — this covers both
        // "both empty" (unparseable) and "both literally 0" cases. Treated as
        // zero_amount rather than invalid_amount: an empty debit/credit pair
        // reads as "no movement recorded", not "garbage data", matching the
        // spirit of the signed-amount branch's "parses to 0" case.
        return { rowNumber, status: 'invalid', issues: ['zero_amount'], raw };
      }
    } else {
      const amountVal = parseSheetAmount(getCell('amount'));
      if (amountVal === null) {
        return { rowNumber, status: 'invalid', issues: ['invalid_amount'], raw };
      }
      if (amountVal === 0) {
        return { rowNumber, status: 'invalid', issues: ['zero_amount'], raw };
      }
      const isExpense = invertSign ? amountVal > 0 : amountVal < 0;
      if (isExpense) {
        debit = Math.abs(amountVal);
      } else {
        credit = Math.abs(amountVal);
      }
    }

    // Rule 5: description / counterparty
    const descText = cellText(getCell('description'));
    const counterpartyText = cellText(getCell('counterparty'));
    const paymentPurpose = descText || counterpartyText || '';
    const counterpartyName = counterpartyText || descText || '—';

    // Rule 6: currency
    const issues: SheetRowIssue[] = [];
    const currencyText = cellText(getCell('currency'));
    let currency = defaultCurrency;
    if (currencyText !== '') {
      if (ISO_CURRENCY_RE.test(currencyText)) {
        currency = currencyText.toUpperCase();
      } else {
        issues.push('unknown_currency');
      }
    }

    const transaction: ParsedTransaction = {
      transactionDate,
      counterpartyName,
      debit,
      credit,
      paymentPurpose,
      currency,
    };

    return { rowNumber, status: 'ok', issues, transaction, raw };
  });

  // Rule 7: in-file dedup, scoped to rows that are (still) ok — a skipped or
  // already-invalid row never entered the candidate pool and can't collide.
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

  const summary = { ok: 0, invalid: 0, skipped: 0 };
  for (const row of rows) {
    summary[row.status] += 1;
  }

  return { rows, summary };
};
