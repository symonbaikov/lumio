import { ExchangeRatesService } from '../../exchange-rates/exchange-rates.service';
import type { MappedSheetRow } from './map-sheet-rows';
import { Injectable } from '@nestjs/common';

export interface CurrencyConversionResult {
  rows: MappedSheetRow[];
  warnings: string[];
}

/** `yyyy-mm-dd` from a UTC-constructed `Date`, used both as the dedup key and the warning suffix. */
const dateOnlyKey = (date: Date): string => date.toISOString().slice(0, 10);

/** Group key for "one `getRate` call per unique currency+date". */
const groupKey = (currency: string, dateKey: string): string => `${currency}:${dateKey}`;

/** Rounds a monetary value to 2 decimal places without naive floating-point drift. */
const roundMoney = (value: number): number => Math.round(value * 100) / 100;

interface ConvertibleRow {
  row: MappedSheetRow;
  currency: string;
  dateKey: string;
}

/** Rows with `status === 'ok'` and a currency differing from `workspaceCurrency`. */
const findConvertibleRows = (rows: MappedSheetRow[], workspaceCurrency: string): ConvertibleRow[] => {
  const normalizedWorkspaceCurrency = workspaceCurrency.trim().toUpperCase();
  const convertible: ConvertibleRow[] = [];

  for (const row of rows) {
    if (row.status !== 'ok' || !row.transaction) {
      continue;
    }
    const currency = (row.transaction.currency ?? '').trim().toUpperCase();
    if (!currency || currency === normalizedWorkspaceCurrency) {
      continue;
    }
    convertible.push({
      row,
      currency,
      dateKey: dateOnlyKey(row.transaction.transactionDate),
    });
  }

  return convertible;
};

/** Applies a resolved rate to a single row, matching `createTransaction`'s FX convention. */
const applyRate = (row: MappedSheetRow, rate: number): void => {
  const transaction = row.transaction;
  if (!transaction) {
    return;
  }
  if (transaction.debit !== undefined) {
    transaction.amountForeign = transaction.debit;
    transaction.debit = roundMoney(transaction.debit * rate);
  } else if (transaction.credit !== undefined) {
    transaction.amountForeign = transaction.credit;
    transaction.credit = roundMoney(transaction.credit * rate);
  }
  transaction.exchangeRate = rate;
};

@Injectable()
export class SheetCurrencyService {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  /**
   * Converts `ok` rows whose currency differs from `workspaceCurrency` into
   * the workspace currency, in place, following the same FX convention
   * `createTransaction` uses: `amountForeign` = original amount,
   * `exchangeRate` = the resolved rate, `debit`/`credit` = converted amount.
   *
   * Rates are fetched once per unique (currency, date) pair via a sequential
   * loop over deduplicated keys — never once per row, and never
   * concurrently against duplicate keys. If a given pair's rate can't be
   * resolved, every row sharing that pair is left untouched and a single
   * `fx_unavailable:<CUR>:<date>` warning is added for that pair.
   */
  async convertRows(rows: MappedSheetRow[], workspaceCurrency: string): Promise<CurrencyConversionResult> {
    const convertible = findConvertibleRows(rows, workspaceCurrency);
    const normalizedWorkspaceCurrency = workspaceCurrency.trim().toUpperCase();

    const uniqueKeys = new Map<string, { currency: string; dateKey: string; date: Date }>();
    for (const entry of convertible) {
      const key = groupKey(entry.currency, entry.dateKey);
      if (!uniqueKeys.has(key)) {
        uniqueKeys.set(key, {
          currency: entry.currency,
          dateKey: entry.dateKey,
          date: entry.row.transaction!.transactionDate,
        });
      }
    }

    const warnings: string[] = [];
    const rates = new Map<string, number>();

    for (const [key, { currency, dateKey, date }] of uniqueKeys) {
      try {
        const rate = await this.exchangeRatesService.getRate(currency, normalizedWorkspaceCurrency, date);
        rates.set(key, rate);
      } catch {
        warnings.push(`fx_unavailable:${currency}:${dateKey}`);
      }
    }

    for (const entry of convertible) {
      const key = groupKey(entry.currency, entry.dateKey);
      const rate = rates.get(key);
      if (rate !== undefined) {
        applyRate(entry.row, rate);
      }
    }

    return { rows, warnings };
  }
}
