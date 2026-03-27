import { advancedLanguageDetector } from '../../../common/utils/advanced-language-detector.util';
import { BankProfileService } from '../../../common/utils/bank-profiles.util';
import { FeatureFlagService } from '../../../common/utils/feature-flags.util';
import { LanguageCacheService } from '../../../common/utils/language-cache.util';
import {
  type DetectedLocale,
  detectLocaleFromText,
} from '../../../common/utils/language-detector.util';
import {
  detectFieldType,
  getFieldSynonyms,
  getLanguagePatterns,
} from '../../../common/utils/language-patterns.util';
import {
  normalizeDate,
  normalizeNumber,
  normalizeNumberAdvanced,
} from '../../../common/utils/number-normalizer.util';
import {
  UnicodeFieldDetector,
  UnicodeTextProcessor,
} from '../../../common/utils/unicode-patterns.util';
import type { BankName, FileType } from '../../../entities/statement.entity';
import type { ParsedStatement } from '../interfaces/parsed-statement.interface';
import type { IParser } from '../interfaces/parser.interface';

export abstract class BaseParser implements IParser {
  constructor(
    protected languageCacheService: LanguageCacheService = new LanguageCacheService(),
    protected featureFlagService: FeatureFlagService = new FeatureFlagService(),
    protected bankProfileService: BankProfileService = new BankProfileService(),
  ) {}

  abstract canParse(
    bankName: BankName,
    fileType: FileType,
    filePath: string,
    cachedText?: string,
  ): Promise<boolean>;

  abstract parse(filePath: string, cachedText?: string): Promise<ParsedStatement>;

  getVersion(): string {
    return '2.0.0';
  }

  protected normalizeNumberValue(
    value: string | number | null | undefined,
    language?: string,
  ): number | null {
    if (!language) {
      return normalizeNumber(value);
    }

    const result = normalizeNumberAdvanced(value, language);
    return result.value ?? null;
  }

  protected normalizeDate(dateStr: string): Date | null {
    return normalizeDate(dateStr);
  }

  protected extractAccountNumber(text: string): string | null {
    // Look for account numbers in format KZXXXXXXXXXXXXX
    const accountRegex = /KZ\d{13,20}/gi;
    const match = text.match(accountRegex);
    return match ? match[0] : null;
  }

  protected extractDateRange(text: string): {
    from: Date | null;
    to: Date | null;
  } {
    // Look for date ranges like "01.01.2024 - 31.01.2024"
    const dateRangeRegex = /(\d{2}\.\d{2}\.\d{4})\s*[-–—]\s*(\d{2}\.\d{2}\.\d{4})/gi;
    const match = text.match(dateRangeRegex);

    if (match) {
      const dates = match[0].split(/[-–—]/).map(d => d.trim());
      return {
        from: this.normalizeDate(dates[0]),
        to: this.normalizeDate(dates[1]),
      };
    }

    return { from: null, to: null };
  }

  protected extractBalance(text: string, label: string): number | null {
    // Look for balance values after labels like "Opening balance:" or "Closing balance:"
    const regex = new RegExp(`${label}[\\s:]*([\\d\\s,.-]+)`, 'gi');
    const match = text.match(regex);
    if (match) {
      return this.normalizeNumberValue(match[0].replace(label, '').trim());
    }
    return null;
  }

  protected normalizeHeader(header: string | null | undefined): string | null {
    if (!header) {
      return null;
    }

    let normalized = header;

    // Use Unicode processing if enabled
    if (this.featureFlagService.shouldUseUnicodeProcessing()) {
      normalized = UnicodeTextProcessor.normalize(header);
    }

    return (
      normalized
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[:\-–—]*\s*$/, '')
        .trim() || null
    );
  }

  protected detectLocale(text: string): DetectedLocale {
    return detectLocaleFromText(text);
  }

  protected extractHeaderFromText(text: string): {
    rawHeader?: string;
    normalizedHeader?: string;
  } {
    if (!text) {
      return {};
    }
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    const rawHeader = lines.slice(0, 3).join(' ').trim();
    const normalizedHeader = this.normalizeHeader(rawHeader);
    return {
      rawHeader: rawHeader || undefined,
      normalizedHeader: normalizedHeader || undefined,
    };
  }

  protected extractHeaderFromRows(rows: Array<string[] | undefined>): {
    rawHeader?: string;
    normalizedHeader?: string;
  } {
    if (!rows || !rows.length) {
      return {};
    }
    const firstRowWithData = rows.find(
      r => Array.isArray(r) && r.some(cell => String(cell ?? '').trim().length > 0),
    );
    if (!firstRowWithData) {
      return {};
    }
    const rawHeader = firstRowWithData
      .map(cell => String(cell ?? '').trim())
      .filter(Boolean)
      .join(' ');
    const normalizedHeader = this.normalizeHeader(rawHeader);
    return {
      rawHeader: rawHeader || undefined,
      normalizedHeader: normalizedHeader || undefined,
    };
  }

  protected async detectLanguage(text: string, context?: { bankName?: string; domain?: string }) {
    // Check if advanced language detection is enabled
    if (this.featureFlagService.isLanguageDetectionEnabled('franc')) {
      const result = await advancedLanguageDetector.detectLanguage(text, context);

      // Update cache if enabled
      if (this.featureFlagService.isCachingEnabled('language')) {
        this.languageCacheService.updateDomainLanguage(
          context?.domain || 'unknown',
          result,
          context?.bankName,
        );
      }

      return result;
    }

    // Fallback to legacy detection
    const { locale, confidence, reason } = await advancedLanguageDetector.detectLanguage(
      text,
      context,
    );
    return { locale, confidence, method: 'legacy', reason };
  }

  protected async detectFieldMapping(header: string, language: string): Promise<string | null> {
    // Check if bank profiles are enabled
    if (this.featureFlagService.shouldUseBankProfiles()) {
      const profiles = this.bankProfileService.findProfilesByLanguage(language);
      const allProfilesMap = new Map(
        this.bankProfileService.getAllProfiles().map(p => [p.profile, p.id]),
      );
      for (const profile of profiles) {
        const profileId = allProfilesMap.get(profile) || '';
        if (profileId) {
          const fieldType = this.bankProfileService.matchColumnHeader(profileId, header);
          if (fieldType) {
            return fieldType;
          }
        }
      }
    }

    // Use language patterns fallback
    if (this.featureFlagService.isUnicodeProcessingEnabled('script')) {
      const scripts = UnicodeTextProcessor.detectScripts(header);
      if (scripts.length > 0) {
        return detectFieldType(header, language);
      }
    }

    // Legacy field detection
    return detectFieldType(header, language);
  }

  protected async processTextWithUnicode(text: string): Promise<string> {
    if (this.featureFlagService.shouldUseUnicodeProcessing()) {
      return UnicodeTextProcessor.cleanForParsing(text);
    }
    return text;
  }

  protected getSynonymsForField(language: string, fieldType: string): string[] {
    return getFieldSynonyms(language, fieldType as any);
  }

  protected getLanguagePatternsForProcessing(language: string) {
    return getLanguagePatterns(language);
  }
}
