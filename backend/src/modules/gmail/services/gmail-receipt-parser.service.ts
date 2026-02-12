import * as fs from 'fs';
import { Injectable, Logger } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';
import { UniversalAmountParser } from '../../parsing/services/universal-amount-parser.service';

type AmountExtractionResult = {
  amount: number;
  currency: string;
};

type AmountCandidate = {
  amount: number;
  currency: string;
  hasTotalKeyword: boolean;
  explicitCurrency: boolean;
  lineIndex: number;
  score: number;
};

const TOTAL_KEYWORD_REGEX =
  /\b(grand\s*total|total\s*amount|amount\s*(due|charged|paid|to\s*pay)|total|итого|сумма|всего|к\s*оплате|оплата|celkem)\b/i;

const NUMBER_PATTERN = '-?\\d{1,3}(?:[\\s.,]\\d{3})*(?:[.,]\\d{1,2})|-?\\d+(?:[.,]\\d{1,2})';

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
  '฿': 'THB',
  '₱': 'PHP',
  '₫': 'VND',
  '₪': 'ILS',
  Kč: 'CZK',
  Ft: 'HUF',
  zł: 'PLN',
  lei: 'RON',
  kn: 'HRK',
  Br: 'BYN',
  kr: 'SEK',
  лв: 'BGN',
};

@Injectable()
export class GmailReceiptParserService {
  private readonly logger = new Logger(GmailReceiptParserService.name);

  constructor(private readonly amountParser: UniversalAmountParser) {}

  async parseReceipt(filePath: string, senderInfo?: string): Promise<any> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const mimeType = this.getMimeType(filePath);

      if (mimeType === 'application/pdf') {
        return await this.parsePdfReceipt(fileBuffer, senderInfo);
      }

      // For now, return basic metadata for non-PDF files
      return {
        confidence: 0.5,
        extracted: false,
      };
    } catch (error) {
      this.logger.error('Failed to parse receipt', error);
      return null;
    }
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private async parsePdfReceipt(buffer: Buffer, senderInfo?: string): Promise<any> {
    try {
      const data = await pdfParse(buffer);
      const text = data.text;

      // Enhanced extraction logic
      const amountWithCurrency = await this.extractAmountWithCurrency(text);
      const amount = amountWithCurrency?.amount;
      const currency = amountWithCurrency?.currency || this.extractCurrency(text) || 'KZT';
      const date = this.extractDate(text);
      const vendor = this.extractVendor(text, senderInfo);
      const tax = this.extractTax(text);
      const lineItems = await this.extractLineItems(text);

      // Calculate subtotal if tax is found
      let subtotal: number | undefined;
      let taxRate: number | undefined;
      if (amount && tax) {
        subtotal = amount - tax;
        taxRate = (tax / subtotal) * 100;
      }

      // Calculate confidence score
      const confidence = this.calculateConfidence({
        amount,
        date,
        vendor,
        tax,
        lineItems,
      });

      return {
        amount,
        currency,
        date,
        vendor,
        tax,
        taxRate,
        subtotal,
        lineItems,
        confidence,
      };
    } catch (error) {
      this.logger.error('Failed to parse PDF receipt', error);
      return null;
    }
  }

  private async extractAmountWithCurrency(
    text: string,
  ): Promise<AmountExtractionResult | undefined> {
    const lines = text
      .split('\n')
      .map(line => line.replace(/\u00a0/g, ' ').trim())
      .filter(Boolean);
    const documentCurrency = this.extractCurrency(text);

    const candidates: AmountCandidate[] = [];

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const hasTotalKeyword = this.hasTotalKeyword(line);
      const fragments = this.extractAmountFragments(line, hasTotalKeyword);

      for (const fragment of fragments) {
        const parsed = await this.parseAmountFragment(fragment);
        if (!parsed || parsed.amount <= 0) {
          continue;
        }

        const fragmentCurrency = this.extractCurrency(fragment);
        const lineCurrency = this.extractCurrency(line);
        const currency =
          parsed.currency || fragmentCurrency || lineCurrency || documentCurrency || 'KZT';
        const explicitCurrency = Boolean(parsed.currency || fragmentCurrency);

        candidates.push({
          amount: parsed.amount,
          currency,
          hasTotalKeyword,
          explicitCurrency,
          lineIndex: index,
          score: this.scoreAmountCandidate(
            parsed.amount,
            hasTotalKeyword,
            explicitCurrency,
            index,
            lines.length,
          ),
        });
      }
    }

    if (candidates.length === 0) {
      return undefined;
    }

    candidates.sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.amount - left.amount;
    });

    const bestCandidate = candidates[0];
    return {
      amount: bestCandidate.amount,
      currency: bestCandidate.currency,
    };
  }

  private extractDate(text: string): string | undefined {
    // Look for date patterns
    const patterns = [/\d{2}[-/.]\d{2}[-/.]\d{4}/, /\d{4}[-/.]\d{2}[-/.]\d{2}/];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }

  private extractVendor(text: string, senderName?: string): string | undefined {
    const senderBrand = this.extractBrandFromSender(senderName);
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    const skipPattern =
      /^(page\s+\d+\s+of\s+\d+|receipt|invoice|order\s+confirmation|payment\s+receipt)$/i;

    for (const line of lines) {
      if (line.length <= 2 || line.length > 40) {
        continue;
      }

      if (skipPattern.test(line)) {
        continue;
      }

      if (this.isLikelySentence(line)) {
        continue;
      }

      return line.slice(0, 100);
    }

    if (senderBrand) {
      return senderBrand;
    }

    return undefined;
  }

  private extractBrandFromSender(sender?: string): string | undefined {
    if (!sender) {
      return undefined;
    }

    const displayName = sender.split('<')[0]?.trim().replace(/^"|"$/g, '');
    if (displayName && !displayName.includes('@')) {
      const cleanedDisplayName = displayName
        .replace(/\s+(support|billing|payments?|service|team|notifications?)$/i, '')
        .trim();

      if (cleanedDisplayName && !this.isLikelySentence(cleanedDisplayName)) {
        return cleanedDisplayName.slice(0, 100);
      }

      return displayName.slice(0, 100);
    }

    const emailMatch = sender.match(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/i);
    const domain = emailMatch?.[1];
    if (!domain) {
      return undefined;
    }

    const rootDomain = domain.split('.')[0] || '';
    if (!rootDomain) {
      return undefined;
    }

    return `${rootDomain.charAt(0).toUpperCase()}${rootDomain.slice(1).toLowerCase()}`;
  }

  private isLikelySentence(value: string): boolean {
    const lower = value.toLowerCase();
    const words = lower.split(/\s+/).filter(Boolean);

    if (words.length >= 6) {
      return true;
    }

    if (/^(we|your|thanks?|dear|hello|hi)\b/.test(lower)) {
      return true;
    }

    if (/[.!?]/.test(value) && words.length >= 4) {
      return true;
    }

    return false;
  }

  private extractTax(text: string): number | undefined {
    // Look for tax patterns
    const patterns = [
      /tax[:\s]+(\d+[\s,.]?\d*)/i,
      /vat[:\s]+(\d+[\s,.]?\d*)/i,
      /НДС[:\s]+(\d+[\s,.]?\d*)/i,
      /налог[:\s]+(\d+[\s,.]?\d*)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const numStr = match[1].replace(/[\s,]/g, '');
        const num = Number.parseFloat(numStr);
        if (!Number.isNaN(num)) {
          return num;
        }
      }
    }

    return undefined;
  }

  private async extractLineItems(
    text: string,
  ): Promise<Array<{ description: string; amount: number }>> {
    const lineItems: Array<{ description: string; amount: number }> = [];
    const lines = text.split('\n').map(line => line.replace(/\u00a0/g, ' '));
    const currencyTokenPattern = this.getCurrencyTokenPattern();
    const itemPattern = new RegExp(
      `^(.+?)\\s+((?:${currencyTokenPattern}\\s*)?(?:${NUMBER_PATTERN})(?:\\s*(?:${currencyTokenPattern}))?)$`,
      'i',
    );

    for (const line of lines) {
      const match = line.trim().match(itemPattern);
      if (match) {
        const description = match[1].trim();
        const parsedAmount = await this.parseAmountFragment(match[2]);
        const amount = parsedAmount?.amount;

        if (
          amount !== undefined &&
          Number.isFinite(amount) &&
          amount > 0 &&
          description.length > 0 &&
          description.length < 200
        ) {
          lineItems.push({ description, amount });
        }
      }
    }

    return lineItems.length > 0 ? lineItems : [];
  }

  private calculateConfidence(data: {
    amount?: number;
    date?: string;
    vendor?: string;
    tax?: number;
    lineItems?: Array<any>;
  }): number {
    let confidence = 0;

    if (data.amount !== undefined) confidence += 30;
    if (data.date) confidence += 20;
    if (data.vendor) confidence += 20;
    if (data.tax) confidence += 15;
    if (data.lineItems && data.lineItems.length > 0) confidence += 15;

    return confidence / 100;
  }

  private hasTotalKeyword(line: string): boolean {
    return TOTAL_KEYWORD_REGEX.test(line);
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

  private extractBestNumberPart(text: string): string | undefined {
    const numberRegex = new RegExp(NUMBER_PATTERN, 'g');
    const matches = text.match(numberRegex);
    if (!matches || matches.length === 0) {
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

    const contextualCurrency = this.amountParser.detectCurrencyFromContext(normalized);
    if (contextualCurrency) {
      return contextualCurrency;
    }

    const lowerText = normalized.toLowerCase();
    if (/\b(тенге|тг)\b/.test(lowerText)) {
      return 'KZT';
    }
    if (/\b(dollars?|доллар)\b/.test(lowerText)) {
      return 'USD';
    }
    if (/\b(euros?|евро)\b/.test(lowerText)) {
      return 'EUR';
    }
    if (/\b(rubles?|руб(ль|лей|ля|.)?)\b/.test(lowerText)) {
      return 'RUB';
    }

    return undefined;
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
}
