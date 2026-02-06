import {
  type PdfTextItem,
  type PdfTextRow,
  extractTablesFromPdf,
  extractTextAndLayoutFromPdf,
  extractTextFromPdf,
} from '../../../common/utils/pdf-parser.util';
import { BankName, FileType } from '../../../entities/statement.entity';
import { AiTransactionExtractor } from '../helpers/ai-transaction-extractor.helper';
import { mapPdfTableRowsToTransactions, mergeTransactions } from '../helpers/pdf-table.helper';
import type { ParsedStatement, ParsedTransaction } from '../interfaces/parsed-statement.interface';
import { BaseParser } from './base.parser';

type ColumnKey = 'date' | 'document' | 'counterparty' | 'bank' | 'debit' | 'credit' | 'purpose';

interface ColumnBoundary {
  key: ColumnKey;
  label: ColumnKey;
  start: number;
  end: number;
  mid: number;
}

export class BerekeNewParser extends BaseParser {
  private aiExtractor = new AiTransactionExtractor();

  async canParse(
    bankName: BankName,
    fileType: FileType,
    filePath: string,
    cachedText?: string,
  ): Promise<boolean> {
    if (bankName !== BankName.BEREKE_NEW || fileType !== FileType.PDF) {
      return false;
    }

    try {
      // Check if file contains Bereke Bank indicators
      const text = (cachedText ?? (await extractTextFromPdf(filePath))).toLowerCase();

      // Look for Bereke Bank indicators
      return (
        text.includes('bereke') || text.includes('береке') || text.includes('kz47914042204kz039ly')
      );
    } catch (error) {
      console.error('Error parsing PDF in canParse:', error);
      return false;
    }
  }

  async parse(filePath: string, cachedText?: string): Promise<ParsedStatement> {
    console.log(`[BerekeNewParser] Starting to parse file: ${filePath}`);
    const extractStartTime = Date.now();

    const { text, rows } = await extractTextAndLayoutFromPdf(filePath);
    const normalizedText = cachedText ?? text;
    const { rows: tableRows } = await extractTablesFromPdf(filePath);
    const extractTime = Date.now() - extractStartTime;
    console.log(
      `[BerekeNewParser] PDF text extracted in ${extractTime}ms, length: ${normalizedText.length} characters, rows: ${rows.length}`,
    );

    // Extract metadata
    console.log(`[BerekeNewParser] Extracting metadata...`);
    const accountNumber = this.extractAccountNumber(normalizedText) || '';
    const dateRange = this.extractDateRange(normalizedText);
    const balanceStart =
      this.extractBalance(normalizedText, 'Остаток на начало') ||
      this.extractBalance(normalizedText, 'Остаток на начало периода');
    const balanceEnd =
      this.extractBalance(normalizedText, 'Остаток на конец') ||
      this.extractBalance(normalizedText, 'Остаток на конец периода');

    console.log(
      `[BerekeNewParser] Metadata extracted - Account: ${
        accountNumber || 'N/A'
      }, Date range: ${dateRange.from?.toISOString() || 'N/A'} to ${
        dateRange.to?.toISOString() || 'N/A'
      }`,
    );
    console.log(
      `[BerekeNewParser] Balance start: ${balanceStart || 'N/A'}, Balance end: ${
        balanceEnd || 'N/A'
      }`,
    );

    // Extract transactions from table
    const transactionStartTime = Date.now();
    console.log(`[BerekeNewParser] Extracting transactions from pdf2table rows...`);
    const tableStart = Date.now();
    const tableTransactions = mapPdfTableRowsToTransactions(tableRows, {
      defaultCurrency: 'KZT',
      stopWords: ['итого', 'оборот', 'остаток'],
    });
    const inferredDateRange = this.inferDateRangeFromTransactions(tableTransactions);
    const resolvedFrom = dateRange.from || inferredDateRange.from || new Date();
    const resolvedTo = dateRange.to || inferredDateRange.to || resolvedFrom;
    const tableTime = Date.now() - tableStart;
    console.log(
      `[BerekeNewParser] pdf2table extracted ${tableTransactions.length} transactions in ${tableTime}ms`,
    );

    // Fallback/merge with layout-based extraction
    console.log(`[BerekeNewParser] Extracting transactions from structured text...`);
    const structuredStart = Date.now();
    const { transactions: structuredTransactions, groupsDetected } = this.extractTransactions(
      normalizedText,
      rows,
    );
    const structuredTime = Date.now() - structuredStart;
    console.log(
      `[BerekeNewParser] Layout-based extraction returned ${structuredTransactions.length} transactions in ${structuredTime}ms`,
    );

    let transactions = mergeTransactions(tableTransactions, structuredTransactions);
    const detectedGroups = Math.max(groupsDetected, transactions.length);

    // AI fallback if structured parsing failed or missed rows
    if (
      (transactions.length === 0 || transactions.length < detectedGroups) &&
      this.aiExtractor.isAvailable()
    ) {
      console.log(
        `[BerekeNewParser] Structured parsing incomplete (${transactions.length}/${detectedGroups}), trying AI extraction...`,
      );
      const aiTransactions = await this.aiExtractor.extractTransactions(normalizedText);
      if (aiTransactions.length) {
        transactions =
          transactions.length > 0
            ? mergeTransactions(transactions, aiTransactions)
            : aiTransactions;
        console.log(
          `[BerekeNewParser] AI extraction succeeded with ${transactions.length} transactions`,
        );
      } else {
        console.log(`[BerekeNewParser] AI extraction did not return transactions`);
      }
    }

    const transactionTime = Date.now() - transactionStartTime;
    console.log(
      `[BerekeNewParser] Extracted ${transactions.length} transactions in ${transactionTime}ms`,
    );

    return {
      metadata: {
        accountNumber,
        dateFrom: resolvedFrom,
        dateTo: resolvedTo,
        balanceStart: balanceStart || undefined,
        balanceEnd: balanceEnd || undefined,
        currency: 'KZT',
      },
      transactions,
    };
  }

  private inferDateRangeFromTransactions(transactions: ParsedTransaction[]): {
    from: Date | null;
    to: Date | null;
  } {
    const dates = transactions
      .map(tx => tx.transactionDate)
      .filter((date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()));

    if (!dates.length) {
      return { from: null, to: null };
    }

    const timestamps = dates.map(date => date.getTime());
    const min = new Date(Math.min(...timestamps));
    const max = new Date(Math.max(...timestamps));
    return { from: min, to: max };
  }

  private extractTransactions(
    text: string,
    rows: PdfTextRow[],
  ): { transactions: ParsedTransaction[]; groupsDetected: number } {
    const structuredRows: PdfTextRow[] =
      rows.length > 0
        ? rows.map(r => ({
            ...r,
            text: (r.text || '').replace(/\s+/g, ' ').trim(),
          }))
        : text
            .split('\n')
            .map((line, idx) => ({
              page: 1,
              y: idx,
              text: line.trim(),
              items: [],
            }))
            .filter(r => r.text.length > 0);

    const cleanRows = structuredRows.filter(r => r.text.length > 0);
    console.log(`[BerekeNewParser] Processing ${cleanRows.length} non-empty lines of text`);

    const headerIndex = cleanRows.findIndex(r => this.isHeaderRow(r.text));
    const columnBoundaries =
      headerIndex >= 0 && cleanRows[headerIndex]?.items?.length
        ? this.buildColumnBoundaries(cleanRows[headerIndex])
        : undefined;

    if (columnBoundaries?.length) {
      const mapping = columnBoundaries
        .map(c => `${c.key} [${Math.round(c.start)} - ${Math.round(c.end)}]@${Math.round(c.mid)}`)
        .join('; ');
      console.log(`[BerekeNewParser] Column boundaries detected: ${mapping}`);
    } else {
      console.log(`[BerekeNewParser] Column boundaries not detected, using heuristics`);
    }

    const dataRows = headerIndex >= 0 ? cleanRows.slice(headerIndex + 1) : cleanRows;
    const groups = this.groupRowsIntoTransactions(dataRows);
    console.log(`[BerekeNewParser] Detected ${groups.length} potential transaction groups`);

    const transactions: ParsedTransaction[] = [];

    groups.forEach((group, idx) => {
      const transaction = this.parseTransactionGroup(group, columnBoundaries);
      if (transaction) {
        transactions.push(transaction);
        if (transactions.length <= 5 || transactions.length % 10 === 0) {
          console.log(
            `[BerekeNewParser] Parsed transaction ${transactions.length}: ${
              transaction.transactionDate.toISOString().split('T')[0]
            } - ${transaction.counterpartyName.substring(0, 30)}...`,
          );
        }
      } else {
        console.log(
          `[BerekeNewParser] Failed to parse group ${idx + 1}: ${group
            .map(g => g.text)
            .join(' | ')
            .substring(0, 200)}...`,
        );
      }
    });

    console.log(`[BerekeNewParser] Total transactions extracted: ${transactions.length}`);
    return { transactions, groupsDetected: groups.length };
  }

  private isHeaderRow(text: string): boolean {
    const lower = text.toLowerCase();
    const keywords = ['дата', 'номер', 'контрагент', 'дебет', 'кредит', 'назначение'];
    const score = keywords.filter(k => lower.includes(k)).length;
    return score >= 3;
  }

  private buildColumnBoundaries(row: PdfTextRow): ColumnBoundary[] | undefined {
    if (!row.items?.length) {
      return undefined;
    }

    const grouped = new Map<ColumnKey, number[]>();
    row.items.forEach(item => {
      const key = this.detectColumnKey(item.text);
      if (!key) {
        return;
      }
      const mid = item.x + (item.width || 0) / 2;
      grouped.set(key, [...(grouped.get(key) || []), mid]);
    });

    const expectedOrder: ColumnKey[] = [
      'date',
      'document',
      'counterparty',
      'bank',
      'debit',
      'credit',
      'purpose',
    ];

    const columns = expectedOrder
      .flatMap(key => {
        const mids = grouped.get(key);
        if (!mids || !mids.length) {
          return [];
        }
        const avg = mids.reduce((sum, val) => sum + val, 0) / mids.length;
        return [{ key, label: key, mid: avg }];
      })
      .sort((a, b) => a.mid - b.mid);

    if (!columns.length) {
      return undefined;
    }

    const boundaries: ColumnBoundary[] = [];
    columns.forEach((col, index) => {
      const prevMid = index === 0 ? 0 : columns[index - 1].mid;
      const nextMid = index === columns.length - 1 ? col.mid + 2000 : columns[index + 1].mid;
      const start = index === 0 ? 0 : (prevMid + col.mid) / 2;
      const end = index === columns.length - 1 ? Number.POSITIVE_INFINITY : (col.mid + nextMid) / 2;

      boundaries.push({
        key: col.key,
        label: col.label,
        start,
        end,
        mid: col.mid,
      });
    });

    return boundaries;
  }

  private detectColumnKey(label: string): ColumnKey | null {
    const lower = label.toLowerCase();
    if (lower.includes('дата')) return 'date';
    if (lower.includes('номер')) return 'document';
    if (lower.includes('банк') && lower.includes('контрагент')) return 'bank';
    if (lower.includes('контрагент')) return 'counterparty';
    if (lower.includes('дебет')) return 'debit';
    if (lower.includes('кредит')) return 'credit';
    if (lower.includes('назнач')) return 'purpose';
    return null;
  }

  private groupRowsIntoTransactions(rows: PdfTextRow[]): PdfTextRow[][] {
    const groups: PdfTextRow[][] = [];
    let current: PdfTextRow[] = [];
    const dateRegex = /\d{2}\.\d{2}\.\d{4}/;

    for (const row of rows) {
      const text = row.text.trim();
      if (!text) {
        continue;
      }

      if (this.isEndOfTable(text)) {
        break;
      }

      if (dateRegex.test(text)) {
        if (current.length) {
          groups.push(current);
        }
        current = [row];
      } else if (current.length) {
        current.push(row);
      }
    }

    if (current.length) {
      groups.push(current);
    }

    return groups;
  }

  private isEndOfTable(text: string): boolean {
    const lower = text.toLowerCase();
    return (
      lower.includes('итого обороты') ||
      (lower.includes('остаток') && !/\d{2}\.\d{2}\.\d{4}/.test(text))
    );
  }

  private parseTransactionGroup(
    group: PdfTextRow[],
    columnBoundaries?: ColumnBoundary[],
  ): ParsedTransaction | null {
    const combinedText = group
      .map(g => g.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const items = group.flatMap(g => g.items || []);

    const cells = columnBoundaries?.length
      ? this.extractCellsByColumn(items, columnBoundaries)
      : undefined;

    const dateRaw = (cells?.date || this.extractFirstDate(combinedText)) ?? '';
    const transactionDate = this.normalizeDate(dateRaw);
    if (!transactionDate) {
      return null;
    }

    const documentNumber =
      (cells?.document || this.extractDocumentNumber(combinedText))?.trim() || undefined;

    const counterpartyBlock = cells?.counterparty || '';
    const bankBlock = cells?.bank || '';
    const counterpartyDetails = this.extractCounterpartyDetails(counterpartyBlock || combinedText);

    let debit = this.normalizeNumberValue(cells?.debit);
    let credit = this.normalizeNumberValue(cells?.credit);

    if (debit === null && credit === null) {
      const amounts = this.extractAmountsFromText(combinedText);
      if (amounts.length === 1) {
        debit = amounts[0];
      } else if (amounts.length >= 2) {
        [debit, credit] = amounts;
      }
    }

    let purpose = cells?.purpose?.trim() || '';
    if (!purpose) {
      purpose = this.extractPurposeFromText(combinedText, counterpartyBlock, bankBlock);
    }

    if (!purpose) {
      purpose = 'Не указано';
    }

    const resolvedCounterparty = this.resolveCounterpartyName(
      counterpartyDetails.name,
      purpose,
      combinedText,
    );

    return {
      transactionDate,
      documentNumber,
      counterpartyName: resolvedCounterparty,
      counterpartyBin: counterpartyDetails.bin,
      counterpartyAccount: counterpartyDetails.account,
      counterpartyBank: bankBlock || undefined,
      debit: debit || undefined,
      credit: credit || undefined,
      paymentPurpose: purpose.trim(),
      currency: 'KZT',
    };
  }

  private extractCellsByColumn(
    items: PdfTextItem[],
    columnBoundaries: ColumnBoundary[],
  ): Record<ColumnKey, string> {
    const cells: Record<ColumnKey, string> = {
      date: '',
      document: '',
      counterparty: '',
      bank: '',
      debit: '',
      credit: '',
      purpose: '',
    };

    items.forEach(item => {
      const column = columnBoundaries.find(col => item.x >= col.start && item.x < col.end);
      if (column) {
        cells[column.key] = `${cells[column.key]} ${item.text}`.trim();
      }
    });

    return cells;
  }

  private extractFirstDate(text: string): string | null {
    const match = text.match(/\d{2}\.\d{2}\.\d{4}/);
    return match ? match[0] : null;
  }

  private extractDocumentNumber(text: string): string | undefined {
    const cleaned = text.replace(/\d{2}\.\d{2}\.\d{4}/, '');
    const match = cleaned.match(/\b\d{6,}\b/);
    return match ? match[0] : undefined;
  }

  private extractCounterpartyDetails(text: string): {
    name: string;
    bin?: string;
    account?: string;
  } {
    const binMatch = text.match(/\b\d{12}\b/);
    const accountMatch = text.match(/KZ\d{10,}/i);

    let name = text;
    if (binMatch) {
      name = name.replace(binMatch[0], '');
    }
    if (accountMatch) {
      name = name.replace(accountMatch[0], '');
    }

    name = name.replace(/\s+/g, ' ').trim();

    return {
      name: name || 'Неизвестный контрагент',
      bin: binMatch ? binMatch[0] : undefined,
      account: accountMatch ? accountMatch[0] : undefined,
    };
  }

  private extractAmountsFromText(text: string): number[] {
    const matches = text.match(/\d{1,3}(?:\s\d{3})*(?:[.,]\d{2})/g) || [];
    const numbers = matches
      .map(m => this.normalizeNumberValue(m))
      .filter((n): n is number => n !== null);
    return numbers;
  }

  private extractPurposeFromText(
    text: string,
    counterpartyBlock?: string,
    bankBlock?: string,
  ): string {
    let purpose = text;

    if (counterpartyBlock) {
      purpose = purpose.replace(counterpartyBlock, '');
    }
    if (bankBlock) {
      purpose = purpose.replace(bankBlock, '');
    }

    purpose = purpose
      .replace(/\d{2}\.\d{2}\.\d{4}/g, '')
      .replace(/\b\d{6,}\b/g, '')
      .replace(/KZ\d{10,}/gi, '')
      .replace(/\b\d{12}\b/g, '')
      .replace(/\d{1,3}(?:\s\d{3})*(?:[.,]\d{2})/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return purpose;
  }

  private resolveCounterpartyName(rawName: string, purpose: string, combinedText: string): string {
    if (!this.isUnknownCounterparty(rawName)) {
      return rawName.trim();
    }

    const fromPurpose = this.extractNameFromText(purpose);
    if (fromPurpose) {
      return fromPurpose;
    }

    const fromCombined = this.extractNameFromText(combinedText);
    if (fromCombined) {
      return fromCombined;
    }

    return 'Неизвестный контрагент';
  }

  private extractNameFromText(text: string): string | null {
    const withOrg = text.match(/(АО|ТОО|ИП)\s+[A-Za-zА-Яа-яёЁ0-9"«»().\s-]{3,}/i);
    if (withOrg) {
      return withOrg[0].trim();
    }

    const cleaned = text.replace(/оплата|перевод|зачисление|от\s+/gi, '').trim();
    if (cleaned && cleaned.length > 3 && cleaned.length < 120) {
      return cleaned;
    }

    return null;
  }

  private isUnknownCounterparty(name?: string): boolean {
    if (!name) return true;
    const lower = name.toLowerCase();
    return (
      lower.length < 3 || lower.includes('неизвест') || lower === 'n/a' || lower === 'не указано'
    );
  }
}
