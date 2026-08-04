import * as xlsx from 'xlsx';
import { type BankName, FileType } from '../../../entities/statement.entity';
import type { ParsedStatement, ParsedTransaction } from '../interfaces/parsed-statement.interface';
import { BaseTabularParser } from './base-tabular.parser';

type ExcelCellValue = string | number | boolean | Date | null;
type ExcelRow = ExcelCellValue[];

export class ExcelParser extends BaseTabularParser {
  async canParse(
    _bankName: BankName,
    fileType: FileType,
    _filePath: string,
    _cachedText?: string,
  ): Promise<boolean> {
    return fileType === FileType.XLSX || fileType === FileType.CSV;
  }

  async parse(filePath: string, _cachedText?: string): Promise<ParsedStatement> {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json<ExcelCellValue[]>(worksheet, { header: 1, defval: '' });

    if (data.length < 2) {
      throw new Error('Excel file is empty or has no data rows');
    }

    // First row is header
    const headers = (data[0] || []).map(h => String(h).toLowerCase().trim());
    const rows = data.slice(1);

    // Map columns
    const columnMapping = this.mapColumns(headers);

    // Detect currency from header rows before building transactions
    const headerSample = data
      .slice(0, 5)
      .map(r => (r || []).join(' '))
      .join(' ');
    const detectedCurrency = this.detectCurrency(headerSample) || undefined;

    // Extract metadata from first few rows or filename
    const metadata = this.extractMetadata(filePath, data, detectedCurrency);

    // Extract transactions
    const transactions: ParsedTransaction[] = [];

    for (const row of rows) {
      if (!row || row.length === 0) {
        continue;
      }

      const transaction = this.parseRow(
        row,
        columnMapping,
        index => row[index],
        'Excel',
        detectedCurrency,
      );
      if (transaction) {
        transactions.push(transaction);
      }
    }

    return {
      metadata,
      transactions,
    };
  }
  private extractMetadata(
    _filePath: string,
    data: ExcelRow[],
    detectedCurrency?: string,
  ): ParsedStatement['metadata'] {
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
      currency: detectedCurrency,
      rawHeader: headerInfo.rawHeader,
      normalizedHeader: headerInfo.normalizedHeader,
      locale: localeInfo.locale !== 'unknown' ? localeInfo.locale : undefined,
    };
  }

  private extractAccountNumberFromData(data: ExcelRow[]): string | null {
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

  private extractDateRangeFromData(data: ExcelRow[]): {
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
}
