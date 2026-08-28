import type { ParsedTransaction } from '../interfaces/parsed-statement.interface';
import { BaseParser } from './base.parser';

type TabularColumnMapping = Record<string, number>;

export abstract class BaseTabularParser extends BaseParser {
  protected mapColumns(headers: string[]): TabularColumnMapping {
    const mapping: TabularColumnMapping = {};

    // `??=` (not `=`): a category's keyword can match more than one header
    // in the same file (e.g. both "Сумма операции" and "Сумма в валюте
    // счета" contain "сумма"). The first, left-to-right match — normally
    // the primary column for that category — wins instead of a later,
    // secondary column silently overwriting it with no warning.
    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase();
      if (
        lowerHeader.includes('дата') ||
        lowerHeader.includes('date') ||
        lowerHeader.includes('fecha') ||
        lowerHeader.includes('data')
      ) {
        mapping.date ??= index;
      }
      if (
        lowerHeader.includes('номер') ||
        lowerHeader.includes('документ') ||
        lowerHeader.includes('document') ||
        lowerHeader.includes('номерок') ||
        lowerHeader.includes('doc')
      ) {
        mapping.document ??= index;
      }
      if (
        lowerHeader.includes('контрагент') ||
        lowerHeader.includes('counterparty') ||
        lowerHeader.includes('beneficiary') ||
        lowerHeader.includes('cliente') ||
        lowerHeader.includes('payer') ||
        lowerHeader.includes('payee')
      ) {
        mapping.counterparty ??= index;
      }
      if (
        lowerHeader.includes('бин') ||
        lowerHeader.includes('bin') ||
        lowerHeader.includes('inn') ||
        lowerHeader.includes('tax')
      ) {
        mapping.bin ??= index;
      }
      if (
        lowerHeader.includes('счёт') ||
        lowerHeader.includes('счет') ||
        lowerHeader.includes('account') ||
        lowerHeader.includes('iban')
      ) {
        mapping.account ??= index;
      }
      if (lowerHeader.includes('банк') || lowerHeader.includes('bank')) {
        mapping.bank ??= index;
      }
      if (
        lowerHeader.includes('дебет') ||
        lowerHeader.includes('debit') ||
        lowerHeader.includes('debe')
      ) {
        mapping.debit ??= index;
      }
      if (
        lowerHeader.includes('кредит') ||
        lowerHeader.includes('credit') ||
        lowerHeader.includes('haber')
      ) {
        mapping.credit ??= index;
      }
      if (
        lowerHeader === 'сумма' ||
        lowerHeader === 'amount' ||
        lowerHeader === 'monto' ||
        lowerHeader === 'importe' ||
        lowerHeader.includes('сумма') ||
        lowerHeader.includes('amount')
      ) {
        mapping.amount ??= index;
      }
      if (
        lowerHeader.includes('назначение') ||
        lowerHeader.includes('цель') ||
        lowerHeader.includes('purpose') ||
        lowerHeader.includes('описание') ||
        lowerHeader.includes('description') ||
        lowerHeader.includes('descr') ||
        lowerHeader.includes('concepto')
      ) {
        mapping.purpose ??= index;
      }
      if (
        lowerHeader === 'валюта' ||
        lowerHeader === 'currency' ||
        lowerHeader === 'ccy' ||
        lowerHeader === 'cur' ||
        lowerHeader.includes('валюта') ||
        lowerHeader.includes('currency')
      ) {
        mapping.currency ??= index;
      }
    });

    return mapping;
  }

  protected parseRow(
    _row: unknown,
    columnMapping: TabularColumnMapping,
    getValue: (index: number) => unknown,
    sourceLabel = 'tabular',
    defaultCurrency = 'KZT',
  ): ParsedTransaction | null {
    try {
      const dateIndex = columnMapping.date;
      if (dateIndex === undefined) {
        return null;
      }

      const transactionDate = this.normalizeDate(String(getValue(dateIndex) || ''));
      if (!transactionDate) {
        return null;
      }

      const documentIndex = columnMapping.document;
      const counterpartyIndex = columnMapping.counterparty;
      const binIndex = columnMapping.bin;
      const accountIndex = columnMapping.account;
      const bankIndex = columnMapping.bank;
      const debitIndex = columnMapping.debit;
      const creditIndex = columnMapping.credit;
      const amountIndex = columnMapping.amount;
      const purposeIndex = columnMapping.purpose;
      const currencyIndex = columnMapping.currency;

      // Some exports have a single signed amount column instead of separate
      // debit/credit columns (negative = expense, positive = income — the
      // same convention already used for the Google Sheets import path's
      // equivalent case, see resolveSignedAmount in map-sheet-rows.ts).
      // Without this, every row in such a file has debit=credit=undefined
      // and gets silently dropped downstream as "no debit/credit amount".
      let debit =
        debitIndex !== undefined
          ? this.normalizeNumberValue(getValue(debitIndex) as string | number | null | undefined) ||
            undefined
          : undefined;
      let credit =
        creditIndex !== undefined
          ? this.normalizeNumberValue(
              getValue(creditIndex) as string | number | null | undefined,
            ) || undefined
          : undefined;

      if (debit === undefined && credit === undefined && amountIndex !== undefined) {
        const amountValue = this.normalizeNumberValue(
          getValue(amountIndex) as string | number | null | undefined,
        );
        if (amountValue !== null && amountValue < 0) {
          debit = Math.abs(amountValue);
        } else if (amountValue !== null && amountValue > 0) {
          credit = amountValue;
        }
      }

      const currencyFromColumn =
        currencyIndex !== undefined
          ? String(getValue(currencyIndex) || '')
              .trim()
              .toUpperCase()
          : null;
      const currency =
        currencyFromColumn && /^[A-Z]{3}$/.test(currencyFromColumn)
          ? currencyFromColumn
          : defaultCurrency;

      return {
        transactionDate,
        documentNumber:
          documentIndex !== undefined ? String(getValue(documentIndex) || '') : undefined,
        counterpartyName:
          counterpartyIndex !== undefined ? String(getValue(counterpartyIndex) || '') : 'Unknown',
        counterpartyBin: binIndex !== undefined ? String(getValue(binIndex) || '') : undefined,
        counterpartyAccount:
          accountIndex !== undefined ? String(getValue(accountIndex) || '') : undefined,
        counterpartyBank: bankIndex !== undefined ? String(getValue(bankIndex) || '') : undefined,
        debit,
        credit,
        paymentPurpose:
          purposeIndex !== undefined ? String(getValue(purposeIndex) || '') : 'Не указано',
        currency,
      };
    } catch (error) {
      this.logger.error(`Error parsing ${sourceLabel} row:`, error);
      return null;
    }
  }
}
