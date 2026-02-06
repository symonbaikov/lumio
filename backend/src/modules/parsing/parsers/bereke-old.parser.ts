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

type ColumnKey =
  | 'date'
  | 'document'
  | 'counterparty'
  | 'bin'
  | 'account'
  | 'bank'
  | 'debit'
  | 'credit'
  | 'purpose';

interface ColumnBoundary {
  key: ColumnKey;
  label: ColumnKey;
  start: number;
  end: number;
  mid: number;
}

export class BerekeOldParser extends BaseParser {
  private aiExtractor = new AiTransactionExtractor();

  async canParse(
    bankName: BankName,
    fileType: FileType,
    filePath: string,
    cachedText?: string,
  ): Promise<boolean> {
    if (bankName !== BankName.BEREKE_OLD || fileType !== FileType.PDF) {
      return false;
    }

    try {
      // Check if file contains old format indicators
      const text = (cachedText ?? (await extractTextFromPdf(filePath))).toLowerCase();

      // Look for old format indicators (account KZ17722S000023921191)
      return (
        text.includes('kz17722s000023921191') ||
        (text.includes('bereke') && !text.includes('kz47914042204kz039ly'))
      );
    } catch (error) {
      console.error('Error parsing PDF in canParse:', error);
      return false;
    }
  }

  async parse(filePath: string, cachedText?: string): Promise<ParsedStatement> {
    console.log(`[BerekeOldParser] Starting to parse file: ${filePath}`);
    const extractStartTime = Date.now();

    const { text, rows } = await extractTextAndLayoutFromPdf(filePath);
    const normalizedText = cachedText ?? text;
    const { rows: tableRows } = await extractTablesFromPdf(filePath);
    const extractTime = Date.now() - extractStartTime;
    console.log(
      `[BerekeOldParser] PDF text extracted in ${extractTime}ms, length: ${normalizedText.length} characters, rows: ${rows.length}`,
    );

    // Extract metadata
    console.log(`[BerekeOldParser] Extracting metadata...`);
    const accountNumber = this.extractAccountNumber(normalizedText) || '';
    const dateRange = this.extractDateRange(normalizedText);
    const balanceStart =
      this.extractBalance(normalizedText, 'Остаток на начало') ||
      this.extractBalance(normalizedText, 'Начальный остаток');
    const balanceEnd =
      this.extractBalance(normalizedText, 'Остаток на конец') ||
      this.extractBalance(normalizedText, 'Конечный остаток');

    console.log(
      `[BerekeOldParser] Metadata extracted - Account: ${
        accountNumber || 'N/A'
      }, Date range: ${dateRange.from?.toISOString() || 'N/A'} to ${
        dateRange.to?.toISOString() || 'N/A'
      }`,
    );
    console.log(
      `[BerekeOldParser] Balance start: ${balanceStart || 'N/A'}, Balance end: ${
        balanceEnd || 'N/A'
      }`,
    );

    // Extract transactions - old format has variable structure
    const transactionStartTime = Date.now();
    console.log(`[BerekeOldParser] Extracting transactions from pdf2table rows...`);
    const tableTransactions = mapPdfTableRowsToTransactions(tableRows, {
      defaultCurrency: 'KZT',
      stopWords: ['итого', 'оборот', 'остаток'],
    });
    console.log(`[BerekeOldParser] pdf2table extracted ${tableTransactions.length} transactions`);

    console.log(`[BerekeOldParser] Extracting transactions with layout reconstruction...`);
    const { transactions: structuredTransactions, groupsDetected } = this.extractTransactions(
      normalizedText,
      rows,
    );
    let transactions = mergeTransactions(tableTransactions, structuredTransactions);
    const detectedGroups = Math.max(groupsDetected, transactions.length);

    // AI fallback
    if (
      (transactions.length === 0 || transactions.length < detectedGroups) &&
      this.aiExtractor.isAvailable()
    ) {
      console.log(
        `[BerekeOldParser] Structured parsing incomplete (${transactions.length}/${detectedGroups}), trying AI extraction...`,
      );
      const aiTransactions = await this.aiExtractor.extractTransactions(normalizedText);
      if (aiTransactions.length) {
        transactions =
          transactions.length > 0
            ? mergeTransactions(transactions, aiTransactions)
            : aiTransactions;
        console.log(
          `[BerekeOldParser] AI extraction succeeded with ${transactions.length} transactions`,
        );
      } else {
        console.log(`[BerekeOldParser] AI extraction did not return transactions`);
      }
    }

    const transactionTime = Date.now() - transactionStartTime;
    console.log(
      `[BerekeOldParser] Extracted ${transactions.length} transactions in ${transactionTime}ms`,
    );

    return {
      metadata: {
        accountNumber,
        dateFrom: dateRange.from || new Date(),
        dateTo: dateRange.to || new Date(),
        balanceStart: balanceStart || undefined,
        balanceEnd: balanceEnd || undefined,
        currency: 'KZT',
      },
      transactions,
    };
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
    console.log(`[BerekeOldParser] Processing ${cleanRows.length} non-empty lines of text`);

    const headerIndex = cleanRows.findIndex(r => this.isHeaderRow(r.text));
    const columnBoundaries =
      headerIndex >= 0 && cleanRows[headerIndex]?.items?.length
        ? this.buildColumnBoundaries(cleanRows[headerIndex])
        : undefined;

    if (columnBoundaries?.length) {
      const mapping = columnBoundaries
        .map(c => `${c.key} [${Math.round(c.start)} - ${Math.round(c.end)}]@${Math.round(c.mid)}`)
        .join('; ');
      console.log(`[BerekeOldParser] Column boundaries detected: ${mapping}`);
    } else {
      console.log(`[BerekeOldParser] Column boundaries not detected, using heuristics`);
    }

    const dataRows = headerIndex >= 0 ? cleanRows.slice(headerIndex + 1) : cleanRows;
    const groups = this.groupRowsIntoTransactions(dataRows);
    console.log(`[BerekeOldParser] Detected ${groups.length} potential transaction groups`);

    const transactions: ParsedTransaction[] = [];

    groups.forEach((group, idx) => {
      const transaction = this.parseTransactionGroup(group, columnBoundaries);
      if (transaction) {
        transactions.push(transaction);
        if (transactions.length <= 5 || transactions.length % 10 === 0) {
          console.log(
            `[BerekeOldParser] Parsed transaction ${transactions.length}: ${
              transaction.transactionDate.toISOString().split('T')[0]
            } - ${transaction.counterpartyName.substring(0, 30)}...`,
          );
        }
      } else {
        console.log(
          `[BerekeOldParser] Failed to parse group ${idx + 1}: ${group
            .map(g => g.text)
            .join(' | ')
            .substring(0, 200)}...`,
        );
      }
    });

    console.log(`[BerekeOldParser] Total transactions extracted: ${transactions.length}`);
    return { transactions, groupsDetected: groups.length };
  }

  private isHeaderRow(text: string): boolean {
    const lower = text.toLowerCase();
    const keywords = ['дата', 'контрагент', 'дебет', 'кредит', 'назначение', 'номер'];
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
      'bin',
      'account',
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
    if (lower.includes('контрагент')) return 'counterparty';
    if (lower.includes('бин')) return 'bin';
    if (lower.includes('сч')) return 'account';
    if (lower.includes('банк')) return 'bank';
    if (lower.includes('дебет')) return 'debit';
    if (lower.includes('кредит')) return 'credit';
    if (lower.includes('назнач') || lower.includes('основан')) return 'purpose';
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
      lower.includes('итого') || (lower.includes('остаток') && !/\d{2}\.\d{2}\.\d{4}/.test(text))
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

    const counterpartyBlock =
      cells?.counterparty ||
      cells?.bin ||
      cells?.account ||
      this.extractCounterpartyBlock(combinedText);
    let bankBlock = cells?.bank || this.extractBic(combinedText) || '';
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

    // Strengthen counterparty name if still unknown
    const counterpartyName = this.resolveCounterpartyName(
      counterpartyDetails.name ||
        counterpartyBlock ||
        this.extractCounterpartyNameFromText(combinedText) ||
        'Неизвестный контрагент',
      purpose,
      combinedText,
    );

    // Ensure bank filled if we have BIC
    if (!bankBlock) {
      bankBlock = this.extractBic(combinedText) || '';
    }

    return {
      transactionDate,
      documentNumber,
      counterpartyName,
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
      bin: '',
      account: '',
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

  private extractCounterpartyBlock(text: string): string {
    const pieces = text.split(/\d{1,3}(?:\s\d{3})*(?:[.,]\d{2})/);
    return pieces.length ? pieces[0].trim() : text;
  }

  private extractCounterpartyNameFromText(text: string): string | null {
    // Look for organization markers before BIN/INN
    const match = text.match(/(АО|ТОО|ИП)\s+[^0-9KZ]{2,120}?(?=\s+БИН|\s+ИНН|\s+KZ|\s+\d{6,}|$)/i);
    if (match?.[0]) {
      return match[0].trim();
    }
    return null;
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
      .replace(/[A-Z]{6}[A-Z0-9]{2,5}/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return purpose;
  }

  private extractBic(text: string): string | null {
    const match = text.match(/[A-Z]{6}[A-Z0-9]{2,5}/);
    return match ? match[0] : null;
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
