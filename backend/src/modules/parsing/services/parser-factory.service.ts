import { Injectable } from '@nestjs/common';
import { extractTextFromPdf } from '../../../common/utils/pdf-parser.util';
import { BankName, FileType } from '../../../entities/statement.entity';
import type { IParser } from '../interfaces/parser.interface';
import { BerekeNewParser } from '../parsers/bereke-new.parser';
import { BerekeOldParser } from '../parsers/bereke-old.parser';
import { CsvParser } from '../parsers/csv.parser';
import { ExcelParser } from '../parsers/excel.parser';
import { GenericPdfParser } from '../parsers/generic-pdf.parser';
import { KaspiParser } from '../parsers/kaspi.parser';

@Injectable()
export class ParserFactoryService {
  private parsers: IParser[] = [];

  constructor() {
    this.parsers = [
      new BerekeNewParser(),
      new BerekeOldParser(),
      new KaspiParser(),
      new GenericPdfParser(),
      new ExcelParser(),
      new CsvParser(),
    ];
  }

  private extractHeaderText(text: string): string {
    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
    const headerLines: string[] = [];

    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const line = lines[i];
      if (this.looksLikeTransaction(line)) {
        break;
      }
      headerLines.push(line);
    }

    if (!headerLines.length) {
      return lines.slice(0, Math.min(lines.length, 10)).join('\n');
    }

    return headerLines.join('\n');
  }

  private looksLikeTransaction(line: string): boolean {
    const hasDate = /\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}/.test(line);
    const hasAmount = /\d[\d\s.,]*\d/.test(line);
    return Boolean(hasDate && hasAmount);
  }

  private detectBankByName(text: string): { bank: 'kaspi' | 'bereke' | null; evidence: string[] } {
    const evidence: string[] = [];
    let bank: 'kaspi' | 'bereke' | null = null;

    const kaspiRegex = /\b(kaspi\s+bank|kaspi\.kz|каспи\s+банк|каспи)(?!\s+business)\b/i;
    const berekeRegex = /\b(bereke\s+bank|bereke\s+business|береке\s+банк|береке)\b/i;

    const kaspiIndex = text.search(kaspiRegex);
    const berekeIndex = text.search(berekeRegex);

    const kaspiFound = kaspiIndex >= 0;
    const berekeFound = berekeIndex >= 0;

    if (kaspiFound) {
      evidence.push('name:kaspi');
    }
    if (berekeFound) {
      evidence.push('name:bereke');
    }

    if (kaspiFound && berekeFound) {
      bank = kaspiIndex <= berekeIndex ? 'kaspi' : 'bereke';
      evidence.push('ambiguous:header-both');
    } else if (kaspiFound) {
      bank = 'kaspi';
    } else if (berekeFound) {
      bank = 'bereke';
    }

    return { bank, evidence };
  }

  private detectBankByBic(text: string): { bank: 'kaspi' | 'bereke' | null; evidence: string[] } {
    const evidence: string[] = [];
    let bank: 'kaspi' | 'bereke' | null = null;

    const kaspiRegex = /\bcaspkzka\b/i;
    const berekeRegex = /\bbrkekzka\b/i;

    const kaspiIndex = text.search(kaspiRegex);
    const berekeIndex = text.search(berekeRegex);

    const kaspiFound = kaspiIndex >= 0;
    const berekeFound = berekeIndex >= 0;

    if (kaspiFound) {
      evidence.push('bic:caspkzka');
    }
    if (berekeFound) {
      evidence.push('bic:brkekzka');
    }

    if (kaspiFound && berekeFound) {
      bank = kaspiIndex <= berekeIndex ? 'kaspi' : 'bereke';
      evidence.push('ambiguous:header-bic-both');
    } else if (kaspiFound) {
      bank = 'kaspi';
    } else if (berekeFound) {
      bank = 'bereke';
    }

    return { bank, evidence };
  }

  private collectBankMentions(text: string): string[] {
    const mentions: string[] = [];
    if (/\b(kaspi\s+bank|kaspi\.kz|каспи\s+банк|каспи)(?!\s+business)\b/i.test(text)) {
      mentions.push('Kaspi Bank');
    }
    if (/\b(bereke\s+bank|bereke\s+business|береке\s+банк|береке)\b/i.test(text)) {
      mentions.push('Bereke Bank');
    }
    return mentions;
  }

  async getParser(
    bankName: BankName,
    fileType: FileType,
    filePath: string,
    cachedText?: string,
  ): Promise<IParser | null> {
    console.log(`[ParserFactory] Looking for parser for bank: ${bankName}, fileType: ${fileType}`);
    for (const parser of this.parsers) {
      const parserName = parser.constructor.name;
      console.log(`[ParserFactory] Trying parser: ${parserName}`);
      if (await parser.canParse(bankName, fileType, filePath, cachedText)) {
        console.log(`[ParserFactory] Parser ${parserName} can parse this file`);
        return parser;
      }

      console.log(`[ParserFactory] Parser ${parserName} cannot parse this file`);
    }

    console.log(
      `[ParserFactory] No suitable parser found for bank: ${bankName}, fileType: ${fileType}`,
    );
    return null;
  }

  async detectBankAndFormat(
    filePath: string,
    fileType: FileType,
    cachedText?: string,
  ): Promise<{
    bankName: BankName;
    formatVersion?: string;
    detectedBy?: string;
    detectedEvidence?: string[];
    otherBankMentions?: string[];
  }> {
    console.log(
      `[ParserFactory] Detecting bank and format for file: ${filePath}, type: ${fileType}`,
    );

    // First, try to detect by file content for PDF files
    if (fileType === FileType.PDF) {
      try {
        const text = cachedText ?? (await extractTextFromPdf(filePath));
        const textLower = text.toLowerCase();
        const headerText = this.extractHeaderText(textLower);
        console.log(`[ParserFactory] Extracted header sample: ${headerText.substring(0, 200)}...`);

        const headerNameDetection = this.detectBankByName(headerText);
        const headerBicDetection = this.detectBankByBic(headerText);
        const fullNameDetection = this.detectBankByName(textLower);

        let detectedBy: string | undefined;
        let detectedEvidence: string[] = [];
        let detectedBase: 'kaspi' | 'bereke' | null = null;

        if (headerNameDetection.bank) {
          detectedBase = headerNameDetection.bank;
          detectedBy = 'header-name';
          detectedEvidence = headerNameDetection.evidence;
        } else if (headerBicDetection.bank) {
          detectedBase = headerBicDetection.bank;
          detectedBy = 'header-bic';
          detectedEvidence = headerBicDetection.evidence;
        } else if (fullNameDetection.bank) {
          detectedBase = fullNameDetection.bank;
          detectedBy = 'full-text-name';
          detectedEvidence = fullNameDetection.evidence;
        }

        if (detectedBase === 'kaspi' && detectedBy === 'full-text-name') {
          const berekeByBic = this.detectBankByBic(textLower);
          if (berekeByBic.bank === 'bereke') {
            detectedBase = 'bereke';
            detectedBy = 'full-text-bic';
            detectedEvidence = berekeByBic.evidence;
          }
        }

        const headerMentions = this.collectBankMentions(headerText);
        const fullMentions = this.collectBankMentions(textLower);
        const detectedBankLabel =
          detectedBase === 'kaspi'
            ? 'Kaspi Bank'
            : detectedBase === 'bereke'
              ? 'Bereke Bank'
              : null;

        const headerSet = new Set(headerMentions);
        const bodyMentions = fullMentions.filter(mention => !headerSet.has(mention));
        const otherBankMentions = bodyMentions.filter(mention =>
          detectedBankLabel ? mention !== detectedBankLabel : true,
        );

        if (headerMentions.length > 1 && detectedBankLabel) {
          headerMentions.forEach(mention => {
            if (mention !== detectedBankLabel && !otherBankMentions.includes(mention)) {
              otherBankMentions.push(mention);
            }
          });
        }

        if (detectedBase === 'kaspi') {
          console.log(`[ParserFactory] Detected: Kaspi Bank (${detectedBy || 'unknown'})`);
          return {
            bankName: BankName.KASPI,
            detectedBy,
            detectedEvidence,
            otherBankMentions: otherBankMentions.length ? otherBankMentions : undefined,
          };
        }

        if (detectedBase === 'bereke') {
          if (
            await new BerekeNewParser().canParse(BankName.BEREKE_NEW, fileType, filePath, textLower)
          ) {
            console.log(`[ParserFactory] Detected: Bereke Bank (new format)`);
            return {
              bankName: BankName.BEREKE_NEW,
              formatVersion: 'new',
              detectedBy,
              detectedEvidence,
              otherBankMentions: otherBankMentions.length ? otherBankMentions : undefined,
            };
          }
          if (
            await new BerekeOldParser().canParse(BankName.BEREKE_OLD, fileType, filePath, textLower)
          ) {
            console.log(`[ParserFactory] Detected: Bereke Bank (old format)`);
            return {
              bankName: BankName.BEREKE_OLD,
              formatVersion: 'old',
              detectedBy,
              detectedEvidence,
              otherBankMentions: otherBankMentions.length ? otherBankMentions : undefined,
            };
          }
          console.log(`[ParserFactory] Detected: Bereke Bank (format unknown)`);
          return {
            bankName: BankName.BEREKE_NEW,
            detectedBy,
            detectedEvidence,
            otherBankMentions: otherBankMentions.length ? otherBankMentions : undefined,
          };
        }
      } catch (error) {
        console.error(`[ParserFactory] Error reading file content:`, error);
      }
    }

    // Fallback: Try each parser to detect bank and format
    for (const parser of this.parsers) {
      const parserName = parser.constructor.name;
      console.log(`[ParserFactory] Checking parser: ${parserName}`);

      // Check Kaspi first
      if (
        parser instanceof KaspiParser &&
        (await parser.canParse(BankName.KASPI, fileType, filePath, cachedText))
      ) {
        console.log(`[ParserFactory] Detected: Kaspi Bank`);
        return { bankName: BankName.KASPI };
      }

      if (await parser.canParse(BankName.BEREKE_NEW, fileType, filePath, cachedText)) {
        console.log(`[ParserFactory] Detected: Bereke Bank (new format)`);
        return { bankName: BankName.BEREKE_NEW, formatVersion: 'new' };
      }
      if (await parser.canParse(BankName.BEREKE_OLD, fileType, filePath, cachedText)) {
        console.log(`[ParserFactory] Detected: Bereke Bank (old format)`);
        return { bankName: BankName.BEREKE_OLD, formatVersion: 'old' };
      }
    }

    // Default to other if can't detect
    console.log(`[ParserFactory] Could not detect bank, defaulting to OTHER`);
    return { bankName: BankName.OTHER };
  }
}
