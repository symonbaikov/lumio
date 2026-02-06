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
  }> {
    console.log(
      `[ParserFactory] Detecting bank and format for file: ${filePath}, type: ${fileType}`,
    );

    // First, try to detect by file content for PDF files
    if (fileType === FileType.PDF) {
      try {
        const text = (cachedText ?? (await extractTextFromPdf(filePath))).toLowerCase();
        console.log(`[ParserFactory] Extracted text sample: ${text.substring(0, 200)}...`);

        // Check for Kaspi Bank indicators (check first as it's more specific)
        if (
          text.includes('kaspi') ||
          text.includes('каспи') ||
          text.includes('caspkzka') ||
          text.includes('kaspi bank') ||
          text.includes('kaspi.kz') ||
          text.includes('kaspi бизнес')
        ) {
          console.log(`[ParserFactory] Detected: Kaspi Bank`);
          return { bankName: BankName.KASPI };
        }

        // Check for Bereke Bank indicators
        if (
          text.includes('bereke') ||
          text.includes('береке') ||
          text.includes('kz47914042204kz039ly')
        ) {
          // Try to determine if it's new or old format
          if (
            await new BerekeNewParser().canParse(
              BankName.BEREKE_NEW,
              fileType,
              filePath,
              text,
            )
          ) {
            console.log(`[ParserFactory] Detected: Bereke Bank (new format)`);
            return { bankName: BankName.BEREKE_NEW, formatVersion: 'new' };
          }
          if (
            await new BerekeOldParser().canParse(
              BankName.BEREKE_OLD,
              fileType,
              filePath,
              text,
            )
          ) {
            console.log(`[ParserFactory] Detected: Bereke Bank (old format)`);
            return { bankName: BankName.BEREKE_OLD, formatVersion: 'old' };
          }
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
