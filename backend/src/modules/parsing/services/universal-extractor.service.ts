import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  AiDocumentExtractor,
  type AiExtractionResult,
} from '../helpers/ai-document-extractor.helper';
import type {
  DocumentType,
  LineItem,
  ParsedDocument,
} from '../interfaces/parsed-document.interface';
import { DocumentClassifierService } from './document-classifier.service';
import { OcrService } from './ocr.service';
import { TransactionTypeDetectorService } from './transaction-type-detector.service';
import { UniversalAmountParser } from './universal-amount-parser.service';

export interface ExtractorContext {
  sender?: string;
  subject?: string;
  fileNameHint?: string;
  emailBody?: string;
}

type AmountCandidate = {
  amount: number;
  currency?: string;
  score: number;
};

const TOTAL_KEYWORD_REGEX =
  /\b(grand\s*total|total\s*amount|amount\s*(due|charged|paid|to\s*pay)|total|итого|сумма|всего|к\s*оплате|оплата|celkem)\b/i;

const NUMBER_PATTERN = '-?\\d{1,3}(?:[\\s.,]\\d{3})*(?:[.,]\\d{1,2})?|-?\\d+(?:[.,]\\d{1,2})?';

const SYMBOL_TO_CURRENCY: Record<string, string> = {
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₽': 'RUB',
  '₸': 'KZT',
  '₴': 'UAH',
  '₺': 'TRY',
  '₹': 'INR',
  '₩': 'KRW',
  Kč: 'CZK',
  Ft: 'HUF',
  zł: 'PLN',
  lei: 'RON',
  kn: 'HRK',
  Br: 'BYN',
  kr: 'SEK',
  лв: 'BGN',
};

const DATE_PATTERNS = [/\d{2}[-/.]\d{2}[-/.]\d{4}/, /\d{4}[-/.]\d{2}[-/.]\d{2}/];

const TAX_PATTERNS = [
  /tax[:\s]+(\d+[\s,.]?\d*)/i,
  /vat[:\s]+(\d+[\s,.]?\d*)/i,
  /НДС[:\s]+(\d+[\s,.]?\d*)/i,
  /налог[:\s]+(\d+[\s,.]?\d*)/i,
];

const SUBTOTAL_PATTERNS = [
  /subtotal[:\s]+(\d+[\s,.]?\d*)/i,
  /sub\s*-?\s*total[:\s]+(\d+[\s,.]?\d*)/i,
  /подитог[:\s]+(\d+[\s,.]?\d*)/i,
  /промежуточный\s*итог[:\s]+(\d+[\s,.]?\d*)/i,
];

@Injectable()
export class UniversalExtractorService {
  private readonly logger = new Logger(UniversalExtractorService.name);

  constructor(
    private readonly amountParser: UniversalAmountParser,
    private readonly typeDetector: TransactionTypeDetectorService,
    private readonly classifier: DocumentClassifierService,
    private readonly ocrService: OcrService,
    @Optional()
    @Inject('AI_DOCUMENT_EXTRACTOR')
    private readonly aiExtractor?: AiDocumentExtractor,
  ) {}

  async extractFromText(text: string, context: ExtractorContext = {}): Promise<ParsedDocument> {
    if (!text || !text.trim()) {
      return this.emptyResult();
    }

    const classification = this.classifier.classify(text, {
      fileNameHint: context.fileNameHint,
    });

    const regexResult = await this.extractWithRegex(text, classification.documentType, context);

    const aiResult =
      this.aiExtractor?.isAvailable() && regexResult.confidence < 0.6
        ? await this.aiExtractor.extractFromText(text)
        : null;

    const merged = this.mergeResults(regexResult, aiResult);
    return this.validate(merged);
  }

  async extractFromImage(
    imageBuffer: Buffer,
    mimeType: string,
    context: ExtractorContext = {},
  ): Promise<ParsedDocument> {
    const ocrResult = await this.ocrService.extractTextFromImage(imageBuffer, {
      preprocess: true,
    });

    const fromText = await this.extractFromText(ocrResult.text, context);
    fromText.extractionMethod = 'ocr_regex';
    fromText.confidence = Math.round(fromText.confidence * ocrResult.confidence * 100) / 100;

    if (!this.aiExtractor?.isAvailable()) {
      return fromText;
    }

    const aiFromImage = await this.aiExtractor.extractFromImage(imageBuffer, mimeType);
    const merged = this.mergeResults(fromText, aiFromImage);
    merged.extractionMethod = 'ocr_hybrid';
    return this.validate(merged);
  }

  async extractFromPdf(pdfBuffer: Buffer, context: ExtractorContext = {}): Promise<ParsedDocument> {
    try {
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(pdfBuffer);
      const text = (data.text || '').trim();

      if (text.length > 50) {
        return this.extractFromText(text, context);
      }
    } catch (error) {
      this.logger.warn('Failed to extract text from PDF via pdf-parse', error);
    }

    const ocrResult = await this.ocrService.extractTextFromScannedPdf(pdfBuffer, {
      preprocess: true,
    });

    if (ocrResult.text.trim().length) {
      const parsed = await this.extractFromText(ocrResult.text, context);
      parsed.extractionMethod = 'ocr_regex';
      parsed.confidence = Math.round(parsed.confidence * ocrResult.confidence * 100) / 100;
      return parsed;
    }

    return this.emptyResult();
  }

  private async extractWithRegex(
    text: string,
    documentType: DocumentType,
    context: ExtractorContext,
  ): Promise<ParsedDocument> {
    const lines = text
      .split('\n')
      .map(line => line.replace(/\u00a0/g, ' ').trim())
      .filter(Boolean);

    const amount = await this.extractAmountWithCurrency(lines, text);
    const currency = amount?.currency || this.extractCurrency(text) || 'KZT';
    const date = this.extractDate(text);
    const vendor = this.extractVendor(lines, context.sender);
    const tax = this.extractNumberByPatterns(text, TAX_PATTERNS);
    const subtotal = this.extractNumberByPatterns(text, SUBTOTAL_PATTERNS);
    const lineItems = await this.extractLineItems(lines);

    const transactionType = this.typeDetector.detect({
      text,
      documentType,
      amount: amount?.amount,
      sender: context.sender,
      subject: context.subject,
    });

    let taxRate: number | undefined;
    if (subtotal && tax && subtotal > 0) {
      taxRate = Math.round((tax / subtotal) * 10000) / 100;
    }

    const fieldConfidence = {
      totalAmount: amount ? 0.85 : 0,
      transactionType: transactionType.confidence,
      date: date ? 0.8 : 0,
      vendor: vendor ? 0.75 : 0,
      currency: currency ? 0.85 : 0,
      tax: tax ? 0.75 : 0,
      lineItems: lineItems.length ? 0.7 : 0,
    };

    return {
      documentType,
      transactionType: transactionType.direction,
      totalAmount: amount?.amount,
      currency,
      date,
      vendor,
      tax,
      taxRate,
      subtotal,
      lineItems,
      confidence: this.calculateOverallConfidence(fieldConfidence),
      extractionMethod: 'regex',
      rawText: text,
      fieldConfidence,
      validationIssues: [],
    };
  }

  private async extractAmountWithCurrency(
    lines: string[],
    fullText: string,
  ): Promise<{ amount: number; currency?: string } | undefined> {
    const documentCurrency = this.extractCurrency(fullText);
    const candidates: AmountCandidate[] = [];

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const hasTotalKeyword = TOTAL_KEYWORD_REGEX.test(line);
      const fragments = this.extractAmountFragments(line, hasTotalKeyword);

      for (const fragment of fragments) {
        const parsed = await this.parseAmountFragment(fragment);
        if (!parsed || parsed.amount <= 0) {
          continue;
        }

        const currency = parsed.currency || this.extractCurrency(line) || documentCurrency;
        const explicitCurrency = Boolean(parsed.currency || this.extractCurrency(fragment));
        const score = this.scoreAmountCandidate(
          parsed.amount,
          hasTotalKeyword,
          explicitCurrency,
          index,
          lines.length,
        );

        candidates.push({
          amount: parsed.amount,
          currency,
          score,
        });
      }
    }

    if (!candidates.length) {
      return undefined;
    }

    candidates.sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return right.amount - left.amount;
    });

    return {
      amount: candidates[0].amount,
      currency: candidates[0].currency,
    };
  }

  private extractAmountFragments(line: string, includeNumbersWithoutCurrency: boolean): string[] {
    const withCurrencyPattern = new RegExp(
      `${this.getCurrencyTokenPattern()}\\s*(?:${NUMBER_PATTERN})|(?:${NUMBER_PATTERN})\\s*${this.getCurrencyTokenPattern()}`,
      'gi',
    );

    const fragments = new Set<string>();
    for (const match of line.matchAll(withCurrencyPattern)) {
      const value = match[0]?.trim();
      if (value) {
        fragments.add(value);
      }
    }

    if (includeNumbersWithoutCurrency) {
      const numberRegex = new RegExp(NUMBER_PATTERN, 'g');
      for (const match of line.matchAll(numberRegex)) {
        const value = match[0]?.trim();
        if (value && /\d/.test(value)) {
          fragments.add(value);
        }
      }
    }

    return Array.from(fragments);
  }

  private async parseAmountFragment(
    fragment: string,
  ): Promise<{ amount: number; currency?: string } | null> {
    const normalized = fragment.replace(/\u00a0/g, ' ').trim();
    if (!normalized) {
      return null;
    }

    const currency = this.extractCurrency(normalized);
    const numberPart = this.extractBestNumberPart(normalized);
    if (!numberPart) {
      return null;
    }

    const parsedNumber = await this.amountParser.parseAmount(numberPart);
    if (parsedNumber && this.amountParser.isValidAmount(parsedNumber.amount)) {
      return {
        amount: Math.abs(parsedNumber.amount),
        currency,
      };
    }

    const direct = await this.amountParser.parseAmount(normalized);
    if (direct && this.amountParser.isValidAmount(direct.amount)) {
      return {
        amount: Math.abs(direct.amount),
        currency: direct.currency || currency,
      };
    }

    return null;
  }

  private extractBestNumberPart(value: string): string | undefined {
    const numberRegex = new RegExp(NUMBER_PATTERN, 'g');
    const matches = value.match(numberRegex);
    if (!matches?.length) {
      return undefined;
    }

    return matches.sort((left, right) => right.length - left.length)[0];
  }

  private extractCurrency(text: string): string | undefined {
    if (!text) {
      return undefined;
    }

    const normalized = text.replace(/\u00a0/g, ' ');

    const supportedCurrencies = new Set(this.amountParser.getSupportedCurrencies());
    const codeMatches = normalized.toUpperCase().match(/\b[A-Z]{3}\b/g) || [];
    for (const code of codeMatches) {
      if (supportedCurrencies.has(code)) {
        return code;
      }
    }

    for (const [symbol, code] of Object.entries(SYMBOL_TO_CURRENCY)) {
      if (normalized.includes(symbol)) {
        return code;
      }
    }

    const contextual = this.amountParser.detectCurrencyFromContext(normalized);
    if (contextual) {
      return contextual;
    }

    const lower = normalized.toLowerCase();
    if (/\b(тенге|тг)\b/.test(lower)) {
      return 'KZT';
    }
    if (/\b(dollars?|доллар)\b/.test(lower)) {
      return 'USD';
    }
    if (/\b(euros?|евро)\b/.test(lower)) {
      return 'EUR';
    }
    if (/\b(rubles?|руб(ль|лей|ля|.)?)\b/.test(lower)) {
      return 'RUB';
    }

    return undefined;
  }

  private extractDate(text: string): Date | undefined {
    for (const pattern of DATE_PATTERNS) {
      const match = text.match(pattern);
      if (!match?.[0]) {
        continue;
      }

      const candidate = match[0];
      if (/^\d{4}/.test(candidate)) {
        const date = new Date(candidate.replace(/[/.]/g, '-'));
        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }

      const [left, middle, right] = candidate.split(/[./-]/).map(part => Number(part));
      if (left > 0 && middle > 0 && right > 0) {
        const date = new Date(right, middle - 1, left);
        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return undefined;
  }

  private extractVendor(lines: string[], sender?: string): string | undefined {
    for (const line of lines.slice(0, 8)) {
      if (line.length <= 2 || line.length > 50) {
        continue;
      }

      if (/^(page\s+\d+|receipt|invoice|чек|квитанция)$/i.test(line)) {
        continue;
      }

      if (/\b(total|итого|tax|vat|ндс|date|дата|amount)\b/i.test(line)) {
        continue;
      }

      if (/^\d+$/.test(line)) {
        continue;
      }

      if (/^[\d.,\s]+$/.test(line)) {
        continue;
      }

      return line.slice(0, 100);
    }

    if (!sender) {
      return undefined;
    }

    const displayName = sender.split('<')[0]?.trim().replace(/^"|"$/g, '');
    if (displayName && !displayName.includes('@')) {
      return displayName.slice(0, 100);
    }

    return undefined;
  }

  private extractNumberByPatterns(text: string, patterns: RegExp[]): number | undefined {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match?.[1]) {
        continue;
      }

      const cleaned = match[1].replace(/[\s,]/g, '');
      const parsed = Number.parseFloat(cleaned);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private async extractLineItems(lines: string[]): Promise<LineItem[]> {
    const lineItems: LineItem[] = [];
    const itemPattern = new RegExp(
      `^(.+?)\\s+((?:${this.getCurrencyTokenPattern()}\\s*)?(?:${NUMBER_PATTERN})(?:\\s*(?:${this.getCurrencyTokenPattern()}))?)$`,
      'i',
    );

    for (const line of lines) {
      if (TOTAL_KEYWORD_REGEX.test(line) || TAX_PATTERNS.some(pattern => pattern.test(line))) {
        continue;
      }

      const match = line.match(itemPattern);
      if (!match) {
        continue;
      }

      const description = match[1].trim();
      const amount = await this.parseAmountFragment(match[2]);
      if (
        amount?.amount !== undefined &&
        Number.isFinite(amount.amount) &&
        amount.amount > 0 &&
        description.length > 0 &&
        description.length < 200
      ) {
        lineItems.push({
          description,
          amount: amount.amount,
        });
      }
    }

    return lineItems;
  }

  private mergeResults(
    primary: ParsedDocument,
    aiResult: AiExtractionResult | null,
  ): ParsedDocument {
    if (!aiResult) {
      return primary;
    }

    const merged: ParsedDocument = {
      ...primary,
      totalAmount: primary.totalAmount ?? aiResult.totalAmount,
      transactionType:
        primary.transactionType !== 'unknown'
          ? primary.transactionType
          : aiResult.transactionType || 'unknown',
      currency: primary.currency || aiResult.currency,
      date: primary.date || (aiResult.date ? new Date(aiResult.date) : undefined),
      vendor: primary.vendor || aiResult.vendor,
      tax: primary.tax ?? aiResult.tax,
      taxRate: primary.taxRate ?? aiResult.taxRate,
      subtotal: primary.subtotal ?? aiResult.subtotal,
      lineItems: primary.lineItems.length ? primary.lineItems : aiResult.lineItems || [],
      categoryHint: primary.categoryHint || aiResult.categoryHint,
      paymentMethod: primary.paymentMethod || aiResult.paymentMethod,
      documentNumber: primary.documentNumber || aiResult.documentNumber,
      extractionMethod: 'hybrid',
      fieldConfidence: {
        ...primary.fieldConfidence,
        totalAmount: primary.fieldConfidence.totalAmount || (aiResult.totalAmount ? 0.75 : 0),
        transactionType:
          primary.fieldConfidence.transactionType || (aiResult.transactionType ? 0.7 : 0),
        date: primary.fieldConfidence.date || (aiResult.date ? 0.7 : 0),
        vendor: primary.fieldConfidence.vendor || (aiResult.vendor ? 0.7 : 0),
        currency: primary.fieldConfidence.currency || (aiResult.currency ? 0.7 : 0),
        tax: primary.fieldConfidence.tax || (aiResult.tax ? 0.65 : 0),
        lineItems: primary.fieldConfidence.lineItems || (aiResult.lineItems?.length ? 0.65 : 0),
      },
    };

    merged.confidence = this.calculateOverallConfidence(merged.fieldConfidence);
    return merged;
  }

  private validate(doc: ParsedDocument): ParsedDocument {
    const validationIssues: string[] = [...doc.validationIssues];

    if (doc.subtotal && doc.tax && doc.totalAmount) {
      const expectedTotal = doc.subtotal + doc.tax;
      if (Math.abs(expectedTotal - doc.totalAmount) > 0.01) {
        validationIssues.push(
          `Subtotal (${doc.subtotal}) + tax (${doc.tax}) does not match total (${doc.totalAmount})`,
        );
      }
    }

    if (doc.lineItems.length > 0 && doc.totalAmount) {
      const lineItemsSum = doc.lineItems.reduce((sum, item) => sum + item.amount, 0);
      const compareTo = doc.subtotal || doc.totalAmount;
      if (Math.abs(lineItemsSum - compareTo) > compareTo * 0.05) {
        validationIssues.push(
          `Line items sum (${lineItemsSum.toFixed(2)}) does not match total (${compareTo.toFixed(2)})`,
        );
      }
    }

    return {
      ...doc,
      validationIssues,
    };
  }

  private calculateOverallConfidence(fieldConfidence: ParsedDocument['fieldConfidence']): number {
    const weights = {
      totalAmount: 0.35,
      transactionType: 0.2,
      date: 0.15,
      vendor: 0.15,
      currency: 0.05,
      tax: 0.05,
      lineItems: 0.05,
    } as const;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [field, weight] of Object.entries(weights) as Array<
      [keyof typeof weights, number]
    >) {
      const confidence = fieldConfidence[field];
      if (confidence === undefined || confidence <= 0) {
        continue;
      }

      weightedSum += confidence * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return 0;
    }

    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  private scoreAmountCandidate(
    amount: number,
    hasTotalKeyword: boolean,
    explicitCurrency: boolean,
    lineIndex: number,
    totalLines: number,
  ): number {
    let score = 0;

    if (hasTotalKeyword) {
      score += 100;
    }

    if (explicitCurrency) {
      score += 30;
    }

    const lineWeight = totalLines > 1 ? lineIndex / (totalLines - 1) : 1;
    score += lineWeight * 20;
    score += Math.min(Math.log10(amount + 1) * 5, 20);

    return score;
  }

  private getCurrencyTokenPattern(): string {
    const symbols = Object.keys(SYMBOL_TO_CURRENCY)
      .sort((left, right) => right.length - left.length)
      .map(symbol => this.escapeRegex(symbol));

    const currencyCodes = this.amountParser
      .getSupportedCurrencies()
      .sort((left, right) => right.length - left.length)
      .map(code => this.escapeRegex(code));

    return `(?:${symbols.join('|')}|${currencyCodes.join('|')})`;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private emptyResult(): ParsedDocument {
    return {
      documentType: 'unknown',
      transactionType: 'unknown',
      lineItems: [],
      confidence: 0,
      extractionMethod: 'regex',
      fieldConfidence: {},
      validationIssues: [],
    };
  }
}
