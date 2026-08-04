import * as fs from 'fs';
import csv from 'csv-parser';
import { type BankName, FileType } from '../../../entities/statement.entity';
import type { ParsedStatement, ParsedTransaction } from '../interfaces/parsed-statement.interface';
import { BaseTabularParser } from './base-tabular.parser';

export class CsvParser extends BaseTabularParser {
  async canParse(
    bankName: BankName,
    fileType: FileType,
    filePath: string,
    cachedText?: string,
  ): Promise<boolean> {
    return fileType === FileType.CSV;
  }

  async parse(filePath: string, cachedText?: string): Promise<ParsedStatement> {
    // Detect currency from raw file content before streaming rows
    const rawContent = fs.readFileSync(filePath, 'utf-8').slice(0, 4096);
    const detectedCurrency = this.detectCurrency(rawContent) || undefined;

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
        .on('data', (row: Record<string, string>) => {
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

          const rowValues = Object.values(row);
          const transaction = this.parseRow(
            row,
            columnMapping,
            index => rowValues[index],
            'CSV',
            detectedCurrency,
          );
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
              currency: detectedCurrency,
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
}
