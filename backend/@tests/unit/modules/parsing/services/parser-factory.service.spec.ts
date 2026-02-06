import { BankName, FileType } from '@/entities/statement.entity';
import { BerekeNewParser } from '@/modules/parsing/parsers/bereke-new.parser';
import { BerekeOldParser } from '@/modules/parsing/parsers/bereke-old.parser';
import { CsvParser } from '@/modules/parsing/parsers/csv.parser';
import { ExcelParser } from '@/modules/parsing/parsers/excel.parser';
import { GenericPdfParser } from '@/modules/parsing/parsers/generic-pdf.parser';
import { KaspiParser } from '@/modules/parsing/parsers/kaspi.parser';
import { ParserFactoryService } from '@/modules/parsing/services/parser-factory.service';
import { extractTextFromPdf } from '@/common/utils/pdf-parser.util';
import { Test, type TestingModule } from '@nestjs/testing';

jest.mock('@/common/utils/advanced-language-detector.util', () => ({
  advancedLanguageDetector: {
    detectLanguage: jest.fn().mockResolvedValue({
      locale: 'unknown',
      confidence: 0,
      method: 'legacy',
      reason: 'mock',
    }),
  },
}));

jest.mock('@/common/utils/pdf-parser.util', () => ({
  extractTextFromPdf: jest.fn().mockResolvedValue('kaspi bank statement'),
}));

describe('ParserFactoryService', () => {
  let testingModule: TestingModule;
  let service: ParserFactoryService;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [ParserFactoryService],
    }).compile();

    service = testingModule.get<ParserFactoryService>(ParserFactoryService);

    // Avoid real file I/O inside parsers
    jest.spyOn(BerekeNewParser.prototype, 'canParse').mockResolvedValue(false);
    jest.spyOn(BerekeOldParser.prototype, 'canParse').mockResolvedValue(false);
    jest.spyOn(KaspiParser.prototype, 'canParse').mockResolvedValue(false);
    jest.spyOn(ExcelParser.prototype, 'canParse').mockResolvedValue(false);
    jest.spyOn(CsvParser.prototype, 'canParse').mockResolvedValue(false);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await testingModule.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getParser', () => {
    it('returns null when no parser can parse', async () => {
      const parser = await service.getParser(BankName.KASPI, FileType.PDF, '/tmp/mock.pdf');

      expect(parser).toBeNull();
    });

    it('returns first parser that can parse', async () => {
      jest.spyOn(KaspiParser.prototype, 'canParse').mockResolvedValue(true);

      const parser = await service.getParser(BankName.KASPI, FileType.PDF, '/tmp/mock.pdf');

      expect(parser).toBeInstanceOf(KaspiParser);
    });

    it('forwards cachedText into parser canParse', async () => {
      const cachedText = 'kaspi bank statement';
      const canParseSpy = jest
        .spyOn(KaspiParser.prototype, 'canParse')
        .mockResolvedValue(true);

      const parser = await service.getParser(
        BankName.KASPI,
        FileType.PDF,
        '/tmp/mock.pdf',
        cachedText,
      );

      expect(parser).toBeInstanceOf(KaspiParser);
      expect(canParseSpy).toHaveBeenCalledWith(
        BankName.KASPI,
        FileType.PDF,
        '/tmp/mock.pdf',
        cachedText,
      );

      canParseSpy.mockRestore();
    });
  });

  describe('detectBankAndFormat', () => {
    it('detects Kaspi bank from PDF content', async () => {
      const result = await service.detectBankAndFormat('/tmp/mock.pdf', FileType.PDF);
      expect(result.bankName).toBe(BankName.KASPI);
    });

    it('uses cached text for PDF detection', async () => {
      const result = await service.detectBankAndFormat(
        '/tmp/mock.pdf',
        FileType.PDF,
        'kaspi bank statement',
      );

      expect(extractTextFromPdf).not.toHaveBeenCalled();
      expect(result.bankName).toBe(BankName.KASPI);
    });

    it('falls back to OTHER for non-PDF files', async () => {
      const result = await service.detectBankAndFormat('/tmp/mock.xlsx', FileType.XLSX);
      expect(result.bankName).toBeDefined();
    });
  });

  it('initializes all required parsers', () => {
    const parserNames = service.parsers.map(p => p.constructor.name);
    expect(parserNames).toEqual([
      'BerekeNewParser',
      'BerekeOldParser',
      'KaspiParser',
      'GenericPdfParser',
      'ExcelParser',
      'CsvParser',
    ]);
  });
});
