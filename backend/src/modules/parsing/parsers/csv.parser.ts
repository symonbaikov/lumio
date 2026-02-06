import * as fs from 'fs';
import * as csv from 'csv-parser';
import { type BankName, FileType } from '../../../entities/statement.entity';
import type { ParsedStatement, ParsedTransaction } from '../interfaces/parsed-statement.interface';
import { BaseParser } from './base.parser';

export class CsvParser extends BaseParser {
  async canParse(
    bankName: BankName,
    fileType: FileType,
    filePath: string,
    cachedText?: string,
  ): Promise<boolean> {
    return fileType === FileType.CSV;
  }

  async parse(filePath: string, cachedText?: string): Promise<ParsedStatement> {
    return new Promise((resolve, reject) => {
      const transactions: ParsedTransaction[] = [];
      let headers: string[] = [];
      let isFirstRow = true;
      let columnMapping: Record<string, number> = {};

      const stream = fs
        .createReadStream(filePath)
        .pipe(csv({ separator: this.detectSeparator(filePath) }))
        .on('headers', (headerList: string[]) => {
          headers = headerList.map(h => h.toLowerCase().trim());
          columnMapping = this.mapColumns(headers);
        })
        .on('data', (row: any) => {
          if (isFirstRow) {
            isFirstRow = false;
            // Skip if first row looks like header
            const firstRowValues = Object.values(row);
            if (
              firstRowValues.some(
                v =>
                  typeof v === 'string' &&
                  (v.toLowerCase().includes('дата') || v.toLowerCase().includes('date')),
              )
            ) {
              return;
            }
          }

          const transaction = this.parseRow(row, columnMapping);
          if (transaction) {
            transactions.push(transaction);
          }
        })
        .on('end', () => {
          const headerText = headers.join(' ').trim();
          const normalizedHeader = this.normalizeHeader(headerText);
          const localeInfo = this.detectLocale(headerText);
          resolve({
            metadata: {
              accountNumber: 'Unknown',
              dateFrom: new Date(),
              dateTo: new Date(),
              currency: 'KZT',
              rawHeader: headerText || undefined,
              normalizedHeader: normalizedHeader || undefined,
              locale: localeInfo.locale !== 'unknown' ? localeInfo.locale : undefined,
            },
            transactions,
          });
        })
        .on('error', reject);
    });
  }

  private detectSeparator(filePath: string): string {
    // Read first line to detect separator
    const content = fs.readFileSync(filePath, 'utf-8');
    const firstLine = content.split('\n')[0];

    if (firstLine.includes(';')) {
      return ';';
    }

    if (firstLine.includes(',')) {
      return ',';
    }

    if (firstLine.includes('\t')) {
      return '\t';
    }

    return ',';
  }

  private mapColumns(headers: string[]): Record<string, number> {
    const mapping: Record<string, number> = {};

    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase();
      if (
        lowerHeader.includes('дата') ||
        lowerHeader.includes('date') ||
        lowerHeader.includes('fecha') ||
        lowerHeader.includes('data')
      ) {
        mapping.date = index;
      }
      if (
        lowerHeader.includes('номер') ||
        lowerHeader.includes('документ') ||
        lowerHeader.includes('document') ||
        lowerHeader.includes('номерок') ||
        lowerHeader.includes('doc')
      ) {
        mapping.document = index;
      }
      if (
        lowerHeader.includes('контрагент') ||
        lowerHeader.includes('counterparty') ||
        lowerHeader.includes('beneficiary') ||
        lowerHeader.includes('cliente') ||
        lowerHeader.includes('payer') ||
        lowerHeader.includes('payee')
      ) {
        mapping.counterparty = index;
      }
      if (
        lowerHeader.includes('бин') ||
        lowerHeader.includes('bin') ||
        lowerHeader.includes('inn') ||
        lowerHeader.includes('tax')
      ) {
        mapping.bin = index;
      }
      if (
        lowerHeader.includes('счёт') ||
        lowerHeader.includes('счет') ||
        lowerHeader.includes('account') ||
        lowerHeader.includes('iban')
      ) {
        mapping.account = index;
      }
      if (lowerHeader.includes('банк') || lowerHeader.includes('bank')) {
        mapping.bank = index;
      }
      if (
        lowerHeader.includes('дебет') ||
        lowerHeader.includes('debit') ||
        lowerHeader.includes('debe')
      ) {
        mapping.debit = index;
      }
      if (
        lowerHeader.includes('кредит') ||
        lowerHeader.includes('credit') ||
        lowerHeader.includes('haber')
      ) {
        mapping.credit = index;
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
        mapping.purpose = index;
      }
    });

    return mapping;
  }

  private parseRow(row: any, columnMapping: Record<string, number>): ParsedTransaction | null {
    try {
      const dateIndex = columnMapping.date;
      if (dateIndex === undefined) {
        return null;
      }

      const rowValues = Object.values(row);
      const transactionDate = this.normalizeDate(String(rowValues[dateIndex] || ''));
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
      const purposeIndex = columnMapping.purpose;

      return {
        transactionDate,
        documentNumber:
          documentIndex !== undefined ? String(rowValues[documentIndex] || '') : undefined,
        counterpartyName:
          counterpartyIndex !== undefined ? String(rowValues[counterpartyIndex] || '') : 'Unknown',
        counterpartyBin: binIndex !== undefined ? String(rowValues[binIndex] || '') : undefined,
        counterpartyAccount:
          accountIndex !== undefined ? String(rowValues[accountIndex] || '') : undefined,
        counterpartyBank: bankIndex !== undefined ? String(rowValues[bankIndex] || '') : undefined,
        debit:
          debitIndex !== undefined
            ? this.normalizeNumberValue(String(rowValues[debitIndex] || '')) || undefined
            : undefined,
        credit:
          creditIndex !== undefined
            ? this.normalizeNumberValue(String(rowValues[creditIndex] || '')) || undefined
            : undefined,
        paymentPurpose:
          purposeIndex !== undefined ? String(rowValues[purposeIndex] || '') : 'Не указано',
        currency: 'KZT',
      };
    } catch (error) {
      console.error('Error parsing CSV row:', error);
      return null;
    }
  }
}
