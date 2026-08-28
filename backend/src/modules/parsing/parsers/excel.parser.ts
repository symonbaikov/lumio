import * as fs from 'fs';
import * as xlsx from 'xlsx';
import { assertSafeZipDecompressionRatio } from '../../../common/utils/zip-bomb-guard.util';
import { type BankName, FileType } from '../../../entities/statement.entity';
import type { ParsedStatement, ParsedTransaction } from '../interfaces/parsed-statement.interface';
import { BaseTabularParser } from './base-tabular.parser';

type ExcelCellValue = string | number | boolean | Date | null;
type ExcelRow = ExcelCellValue[];

// `sheetRows` (below) only skips converting rows into JS objects — the xlsx
// library still fully inflates every ZIP entry before that cap ever applies,
// so it does NOT bound decompression cost. assertSafeZipDecompressionRatio
// runs first and does: no real bank statement's worksheet XML compresses at
// anywhere near a decompression-bomb ratio.
const MAX_SHEET_ROWS = 50_000;

export class ExcelParser extends BaseTabularParser {
  async canParse(
    _bankName: BankName,
    fileType: FileType,
    _filePath: string,
    _cachedText?: string,
  ): Promise<boolean> {
    // CSV is CsvParser's job: xlsx.readFile reads CSV files without an
    // explicit encoding, garbling any non-ASCII (Cyrillic) text, and its
    // auto-number-conversion misreads a comma-decimal amount like "1500,00"
    // as 150000. CsvParser reads UTF-8 explicitly and leaves amounts as
    // strings for the shared normalizer to parse correctly.
    return fileType === FileType.XLSX;
  }

  async parse(filePath: string, _cachedText?: string): Promise<ParsedStatement> {
    assertSafeZipDecompressionRatio(fs.readFileSync(filePath));
    // raw: false formats every cell through its own display format instead
    // of returning the underlying raw value — critical for genuine Excel
    // Date-typed cells, which otherwise come through as a raw day-count
    // serial number (e.g. 45306) rather than a date string. normalizeDate
    // happily parses that serial as a valid (garbage, ~43,000-years-off)
    // Date instead of failing, so the row wouldn't get dropped — it would
    // silently corrupt. Matches sheet-source-loader.service.ts's read of the
    // same file format for the same reason.
    const workbook = xlsx.readFile(filePath, { sheetRows: MAX_SHEET_ROWS, raw: false });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json<ExcelCellValue[]>(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    if (data.length < 2) {
      throw new Error('Excel file is empty or has no data rows');
    }

    if (data.length >= MAX_SHEET_ROWS) {
      this.logger.warn(
        `Sheet hit the ${MAX_SHEET_ROWS}-row parse cap — rows beyond that were not read`,
      );
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
    const detectedCurrency = this.detectCurrency(headerSample) || 'KZT';

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
    detectedCurrency = 'KZT',
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
