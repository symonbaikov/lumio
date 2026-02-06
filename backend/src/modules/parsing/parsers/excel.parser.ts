import * as XLSX from 'xlsx';
import { type BankName, FileType } from '../../../entities/statement.entity';
import type { ParsedStatement, ParsedTransaction } from '../interfaces/parsed-statement.interface';
import { BaseParser } from './base.parser';

export class ExcelParser extends BaseParser {
  async canParse(
    bankName: BankName,
    fileType: FileType,
    filePath: string,
    cachedText?: string,
  ): Promise<boolean> {
    return fileType === FileType.XLSX || fileType === FileType.CSV;
  }

  async parse(filePath: string, cachedText?: string): Promise<ParsedStatement> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (data.length < 2) {
      throw new Error('Excel file is empty or has no data rows');
    }

    // First row is header
    const headers = (data[0] as any[]).map(h => String(h).toLowerCase().trim());
    const rows = data.slice(1) as any[][];

    // Map columns
    const columnMapping = this.mapColumns(headers);

    // Extract metadata from first few rows or filename
    const metadata = this.extractMetadata(filePath, data as any[][]);

    // Extract transactions
    const transactions: ParsedTransaction[] = [];

    for (const row of rows) {
      if (!row || row.length === 0) {
        continue;
      }

      const transaction = this.parseRow(row, columnMapping);
      if (transaction) {
        transactions.push(transaction);
      }
    }

    return {
      metadata,
      transactions,
    };
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

  private extractMetadata(filePath: string, data: any[][]): ParsedStatement['metadata'] {
    // Try to extract from first rows or use defaults
    const accountNumber = this.extractAccountNumberFromData(data) || 'Unknown';
    const dateRange = this.extractDateRangeFromData(data);
    const headerInfo = this.extractHeaderFromRows(data as Array<string[] | undefined>);
    const localeInfo = this.detectLocale(
      [headerInfo.rawHeader, ...data.slice(0, 3).map(row => (row || []).join(' '))]
        .filter(Boolean)
        .join(' '),
    );

    return {
      accountNumber,
      dateFrom: dateRange.from || new Date(),
      dateTo: dateRange.to || new Date(),
      currency: 'KZT',
      rawHeader: headerInfo.rawHeader,
      normalizedHeader: headerInfo.normalizedHeader,
      locale: localeInfo.locale !== 'unknown' ? localeInfo.locale : undefined,
    };
  }

  private extractAccountNumberFromData(data: any[][]): string | null {
    // Look in first few rows
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      if (row) {
        const text = row.join(' ');
        const account = this.extractAccountNumber(text);
        if (account) {
          return account;
        }
      }
    }
    return null;
  }

  private extractDateRangeFromData(data: any[][]): {
    from: Date | null;
    to: Date | null;
  } {
    // Look for date range in first few rows
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      if (row) {
        const text = row.join(' ');
        const range = this.extractDateRange(text);
        if (range.from && range.to) {
          return range;
        }
      }
    }
    return { from: null, to: null };
  }

  private parseRow(row: any[], columnMapping: Record<string, number>): ParsedTransaction | null {
    try {
      const dateIndex = columnMapping.date;
      if (dateIndex === undefined) {
        return null;
      }

      const transactionDate = this.normalizeDate(String(row[dateIndex] || ''));
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
        documentNumber: documentIndex !== undefined ? String(row[documentIndex] || '') : undefined,
        counterpartyName:
          counterpartyIndex !== undefined ? String(row[counterpartyIndex] || '') : 'Unknown',
        counterpartyBin: binIndex !== undefined ? String(row[binIndex] || '') : undefined,
        counterpartyAccount:
          accountIndex !== undefined ? String(row[accountIndex] || '') : undefined,
        counterpartyBank: bankIndex !== undefined ? String(row[bankIndex] || '') : undefined,
        debit:
          debitIndex !== undefined
            ? this.normalizeNumberValue(row[debitIndex]) || undefined
            : undefined,
        credit:
          creditIndex !== undefined
            ? this.normalizeNumberValue(row[creditIndex]) || undefined
            : undefined,
        paymentPurpose: purposeIndex !== undefined ? String(row[purposeIndex] || '') : 'Не указано',
        currency: 'KZT',
      };
    } catch (error) {
      console.error('Error parsing Excel row:', error);
      return null;
    }
  }
}
