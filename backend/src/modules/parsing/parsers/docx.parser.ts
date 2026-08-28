import AdmZip = require('adm-zip');
import { type BankName, FileType } from '../../../entities/statement.entity';
import type { ParsedStatement, ParsedTransaction } from '../interfaces/parsed-statement.interface';
import { BaseTabularParser } from './base-tabular.parser';

/**
 * Parses DOCX bank statements by extracting tables from word/document.xml.
 * A table qualifies as a transaction table when one of its first rows maps to
 * a date column plus a money column (debit/credit/amount).
 */
export class DocxParser extends BaseTabularParser {
  async canParse(
    _bankName: BankName,
    fileType: FileType,
    _filePath: string,
    _cachedText?: string,
  ): Promise<boolean> {
    return fileType === FileType.DOCX;
  }

  async parse(filePath: string, _cachedText?: string): Promise<ParsedStatement> {
    const xml = new AdmZip(filePath).readAsText('word/document.xml');
    if (!xml) {
      throw new Error('DOCX file has no word/document.xml');
    }

    const tables = this.extractTables(xml);
    const fullText = this.extractPlainText(xml);
    const detectedCurrency = this.detectCurrency(fullText) || 'KZT';
    const contextYear = this.findContextYear(fullText);

    const transactions: ParsedTransaction[] = [];
    for (const { rows: table, precedingText } of tables) {
      // Whole-table scan: layout tables bury the transaction header deep
      const headerRow = this.findHeaderRow(table, table.length);
      if (!headerRow) {
        continue;
      }
      // "Daily ending balance" tables look like transactions but are running
      // balances — skip them by the caption right before the table.
      if (/daily\s+(account\s+|ending\s+)?balance/i.test(precedingText)) {
        continue;
      }
      // Section caption ("Electronic Withdrawals", "Deposits and Additions")
      // tells us which way unsigned single-column amounts point. The caption
      // may sit before the table, above the header row, or in a "Total …"
      // footer row inside the table.
      const footerText = table
        .map(row => row.join(' '))
        .filter(text => /^\s*total\b/i.test(text))
        .join(' ');
      const sectionText = `${precedingText} ${table
        .slice(0, headerRow.index)
        .flat()
        .join(' ')} ${footerText}`;
      const unsignedDirection = /withdrawal|charges|payment|money out|debit/i.test(sectionText)
        ? ('debit' as const)
        : ('credit' as const);
      for (const row of table.slice(headerRow.index + 1)) {
        const transaction = this.parseRow(
          row,
          headerRow.mapping,
          index => this.expandDate(row[index], contextYear),
          'DOCX',
          detectedCurrency,
          unsignedDirection,
        );
        if (transaction) {
          transactions.push(transaction);
        }
      }
    }

    const headerInfo = this.extractHeaderFromText(fullText);
    const localeInfo = this.detectLocale(fullText);
    const dateRange = this.extractDateRange(fullText);
    const transactionDates = transactions.map(t => t.transactionDate).filter(Boolean);
    const minDate = transactionDates.length
      ? new Date(Math.min(...transactionDates.map(d => d.getTime())))
      : null;
    const maxDate = transactionDates.length
      ? new Date(Math.max(...transactionDates.map(d => d.getTime())))
      : null;

    const balanceStart =
      this.extractBalance(fullText, 'Beginning Balance') ??
      this.extractBalance(fullText, 'Opening Balance') ??
      this.extractBalance(fullText, 'Остаток на начало');
    const balanceEnd =
      this.extractBalance(fullText, 'Ending Balance') ??
      this.extractBalance(fullText, 'Closing Balance') ??
      this.extractBalance(fullText, 'Остаток на конец');

    return {
      metadata: {
        accountNumber: this.extractAccountNumber(fullText) || '',
        currency: detectedCurrency,
        dateFrom: dateRange.from || minDate || new Date(),
        dateTo: dateRange.to || maxDate || dateRange.from || new Date(),
        balanceStart: balanceStart ?? undefined,
        balanceEnd: balanceEnd ?? undefined,
        rawHeader: headerInfo.rawHeader,
        normalizedHeader: headerInfo.normalizedHeader,
        locale: localeInfo.locale !== 'unknown' ? localeInfo.locale : undefined,
      },
      transactions,
    };
  }

  /** Extracts every table as rows of concatenated cell text. */
  private extractTables(xml: string): Array<{ rows: string[][]; precedingText: string }> {
    const tables: Array<{ rows: string[][]; precedingText: string }> = [];
    // ponytail: non-greedy match truncates nested tables at the inner close
    // tag; switch to a depth-tracking scanner if nested layouts show up.
    const tableRegex = /<w:tbl[ >][\s\S]*?<\/w:tbl>/g;
    let lastTableEnd = 0;
    for (let match = tableRegex.exec(xml); match !== null; match = tableRegex.exec(xml)) {
      const rows: string[][] = [];
      for (const tr of match[0].match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []) {
        const cells = (tr.match(/<w:tc[ >][\s\S]*?<\/w:tc>/g) || []).map(tc =>
          this.decodeXmlEntities(
            (tc.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
              .map(t => t.replace(/<[^>]+>/g, ''))
              .join('')
              .trim(),
          ),
        );
        rows.push(cells);
      }
      if (rows.length) {
        // Caption between the previous table and this one; XML markup is
        // bulky, so 4000 chars ≈ a caption paragraph or two
        const precedingText = this.extractPlainText(
          xml.slice(Math.max(lastTableEnd, match.index - 4000), match.index),
        );
        tables.push({ rows, precedingText });
      }
      lastTableEnd = match.index + match[0].length;
    }
    return tables;
  }

  /** Extracts document text with paragraph line breaks for metadata scanning. */
  private extractPlainText(xml: string): string {
    return this.decodeXmlEntities(
      xml
        .replace(/<\/w:p>/g, '\n')
        .replace(/<w:tab[^>]*\/>/g, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/[ \t]+/g, ' '),
    ).trim();
  }

  private decodeXmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  /** First plausible statement year mentioned in the document, if any. */
  private findContextYear(text: string): number | null {
    const match = text.match(/\b(19[5-9]\d|20\d{2})\b/);
    return match ? Number(match[1]) : null;
  }

  /**
   * US statements often show dates as MM/DD with the year only in the header
   * (e.g. Chase "09/15"). Expand those using the document's context year.
   */
  private expandDate(value: unknown, contextYear: number | null): unknown {
    if (typeof value === 'string' && contextYear) {
      const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
      if (match) {
        const month = Number(match[1]);
        const day = Number(match[2]);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${match[2]}/${match[1]}/${contextYear}`;
        }
      }
      // "1-Apr" / "6 Apr" — day + month name without a year
      const dayMonth = value.trim().match(/^(\d{1,2})[- ]([A-Za-z]{3,9})$/);
      if (dayMonth) {
        return `${dayMonth[1]} ${dayMonth[2]} ${contextYear}`;
      }
      // "Apr 8" — month name + day without a year
      const monthDay = value.trim().match(/^([A-Za-z]{3,9})[- ](\d{1,2})$/);
      if (monthDay) {
        return `${monthDay[2]} ${monthDay[1]} ${contextYear}`;
      }
    }
    return value;
  }
}
