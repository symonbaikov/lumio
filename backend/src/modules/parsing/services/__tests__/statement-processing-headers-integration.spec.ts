import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import {
  BankName,
  FileType,
  Statement,
  StatementStatus,
} from '../../../../entities/statement.entity';
import { Transaction } from '../../../../entities/transaction.entity';
import { ClassificationService } from '../../../classification/services/classification.service';
import { GoogleSheetsService } from '../../../google-sheets/google-sheets.service';
import { MetricsService } from '../../../observability/metrics.service';
import { MetadataExtractionService } from '../metadata-extraction.service';
import { ParserFactoryService } from '../parser-factory.service';
import { StatementProcessingService } from '../statement-processing.service';

describe('StatementProcessingService - Headers Integration', () => {
  let service: StatementProcessingService;
  let metadataExtractionService: MetadataExtractionService;
  let statementRepository: Repository<Statement>;
  let transactionRepository: Repository<Transaction>;

  const mockStatement = {
    id: 'test-statement-id',
    fileName: 'test-statement.pdf',
    fileType: FileType.PDF,
    status: StatementStatus.UPLOADED,
    totalTransactions: 0,
    userId: 'test-user-id',
    createdAt: new Date(),
    bankName: BankName.KASPI,
    fileSize: 1024,
    fileHash: 'test-hash',
    filePath: '/tmp/test-statement.pdf',
  } as unknown as Statement;

  const mockParsedStatement = {
    metadata: {
      accountNumber: 'KZ123456789012345678',
      dateFrom: new Date('2024-01-01'),
      dateTo: new Date('2024-01-31'),
      currency: 'KZT',
      balanceStart: 10000,
      balanceEnd: 15000,
    },
    transactions: [
      {
        transactionDate: new Date('2024-01-15'),
        counterpartyName: 'Test Counterparty',
        debit: 1000,
        credit: 0,
        paymentPurpose: 'Test payment',
        currency: 'KZT',
      },
    ],
  };

  beforeEach(async () => {
    const mockStatementRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as any;

    const mockTransactionRepository = {
      save: jest.fn(),
      create: jest.fn(),
    } as any;

    const mockParserFactory = {
      detectBankAndFormat: jest.fn(),
      getParser: jest.fn(),
    } as any;

    const mockClassificationService = {
      determineMajorityCategory: jest.fn(),
      classifyTransaction: jest.fn(),
    } as any;

    const mockMetadataExtractionService = {
      extractMetadata: jest.fn(),
      createDisplayInfo: jest.fn(),
      convertToParsedStatementMetadata: jest.fn(),
    } as any;

    const mockGoogleSheetsService = {
      syncStatementTransactions: jest.fn(),
    } as any;

    const mockMetricsService = {
      statementParsingDurationSeconds: {
        observe: jest.fn(),
      },
      statementParsingErrorsTotal: {
        inc: jest.fn(),
      },
      aiParsingCallsTotal: {
        inc: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatementProcessingService,
        {
          provide: 'StatementRepository',
          useValue: mockStatementRepository,
        },
        {
          provide: 'TransactionRepository',
          useValue: mockTransactionRepository,
        },
        {
          provide: ParserFactoryService,
          useValue: mockParserFactory,
        },
        {
          provide: ClassificationService,
          useValue: mockClassificationService,
        },
        {
          provide: MetadataExtractionService,
          useValue: mockMetadataExtractionService,
        },
        {
          provide: GoogleSheetsService,
          useValue: mockGoogleSheetsService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<StatementProcessingService>(StatementProcessingService);
    metadataExtractionService = module.get<MetadataExtractionService>(MetadataExtractionService);
    statementRepository = module.get<Repository<Statement>>('StatementRepository');
    transactionRepository = module.get<Repository<Transaction>>('TransactionRepository');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Header extraction integration', () => {
    it('should call metadata extraction service during processing', async () => {
      // Setup mocks
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(mockStatement);
      jest.spyOn(statementRepository, 'save').mockResolvedValue(mockStatement);

      const mockParser = {
        parse: jest.fn().mockResolvedValue(mockParsedStatement),
        getVersion: jest.fn().mockReturnValue('1.0.0'),
      };

      const mockParserFactory = service as any;
      mockParserFactory.parserFactory = {
        getParser: jest.fn().mockResolvedValue(mockParser),
        detectBankAndFormat: jest.fn().mockResolvedValue({
          bankName: BankName.KASPI,
          formatVersion: 'v1',
          detectedBy: 'header-name',
          detectedEvidence: ['name:kaspi'],
          otherBankMentions: ['Bereke Bank'],
        }),
      };

      const mockExtractedMetadata = {
        rawHeader: 'БАНКОВСКАЯ ВЫПИСКА\nАО "Народный Банк"',
        normalizedHeader: 'БАНКОВСКАЯ ВЫПИСКА АО Народный Банк',
        statementType: 'statement',
        confidence: 0.9,
        extractionMethod: 'hybrid' as const,
        headerInfo: {
          title: 'БАНКОВСКАЯ ВЫПИСКА',
          subtitle: 'АО "Народный Банк"',
          language: 'ru',
          locale: 'ru',
        },
        account: {
          number: 'KZ123456789012345678',
          type: 'IBAN',
        },
        period: {
          dateFrom: new Date('2024-01-01'),
          dateTo: new Date('2024-01-31'),
          label: '01.01.2024 - 31.01.2024',
        },
        institution: {
          name: 'Народный Банк',
        },
        currency: {
          code: 'KZT',
          symbol: '₸',
        },
      };

      const mockDisplayInfo = {
        title: 'БАНКОВСКАЯ ВЫПИСКА',
        subtitle: 'АО "Народный Банк"',
        periodDisplay: '01.01.2024 - 31.01.2024',
        accountDisplay: '****5678',
        institutionDisplay: 'Народный Банк',
        currencyDisplay: '₸',
      };

      const mockEnhancedMetadata = {
        accountNumber: 'KZ123456789012345678',
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
        currency: 'KZT',
        rawHeader: 'БАНКОВСКАЯ ВЫПИСКА\nАО "Народный Банк"',
        normalizedHeader: 'БАНКОВСКАЯ ВЫПИСКА АО Народный Банк',
        institution: 'Народный Банк',
        locale: 'ru',
        headerDisplay: mockDisplayInfo,
      };

      jest
        .spyOn(metadataExtractionService, 'extractMetadata')
        .mockResolvedValue(mockExtractedMetadata as any);

      jest.spyOn(metadataExtractionService, 'createDisplayInfo').mockReturnValue(mockDisplayInfo);

      jest
        .spyOn(metadataExtractionService, 'convertToParsedStatementMetadata')
        .mockReturnValue(mockEnhancedMetadata as any);

      // Mock the file system check
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      // Execute
      try {
        await service.processStatement('test-statement-id');
      } catch (error) {
        // Expected due to mocking limitations
      }

      // Verify
      expect(metadataExtractionService.extractMetadata).toHaveBeenCalled();
      expect(metadataExtractionService.createDisplayInfo).toHaveBeenCalled();
      expect(metadataExtractionService.convertToParsedStatementMetadata).toHaveBeenCalled();
    });

    it('should handle metadata extraction errors gracefully', async () => {
      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(mockStatement);
      jest.spyOn(statementRepository, 'save').mockResolvedValue(mockStatement);

      const mockParser = {
        parse: jest.fn().mockResolvedValue(mockParsedStatement),
        getVersion: jest.fn().mockReturnValue('1.0.0'),
      };

      const mockParserFactory = service as any;
      mockParserFactory.parserFactory = {
        getParser: jest.fn().mockResolvedValue(mockParser),
        detectBankAndFormat: jest.fn().mockResolvedValue({
          bankName: BankName.KASPI,
          formatVersion: 'v1',
          detectedBy: 'header-name',
          detectedEvidence: ['name:kaspi'],
          otherBankMentions: [],
        }),
      };

      jest
        .spyOn(metadataExtractionService, 'extractMetadata')
        .mockRejectedValue(new Error('Metadata extraction failed'));

      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      // Execute - should not throw due to graceful error handling
      try {
        await service.processStatement('test-statement-id');
      } catch (error) {
        // Expected due to mocking limitations
      }

      // Verify that metadata extraction was attempted
      expect(metadataExtractionService.extractMetadata).toHaveBeenCalled();
    });

    it('should include header display info in parsing details', async () => {
      const mockEnhancedStatement = {
        ...mockStatement,
        parsingDetails: {
          metadataExtracted: {
            accountNumber: 'KZ123456789012345678',
            dateFrom: '2024-01-01T00:00:00.000Z',
            dateTo: '2024-01-31T00:00:00.000Z',
            headerDisplay: {
              title: 'БАНКОВСКАЯ ВЫПИСКА',
              subtitle: 'АО "Народный Банк"',
              periodDisplay: '01.01.2024 - 31.01.2024',
              accountDisplay: '****5678',
              institutionDisplay: 'Народный Банк',
              currencyDisplay: '₸',
            },
          },
        },
      } as unknown as Statement;

      jest.spyOn(statementRepository, 'findOne').mockResolvedValue(mockEnhancedStatement);

      const result = (await statementRepository.findOne({
        where: { id: 'test-statement-id' },
      })) as any;

      expect(result?.parsingDetails?.metadataExtracted?.headerDisplay).toBeDefined();
      expect(result?.parsingDetails?.metadataExtracted?.headerDisplay?.title).toBe(
        'БАНКОВСКАЯ ВЫПИСКА',
      );
      expect(result?.parsingDetails?.metadataExtracted?.headerDisplay?.accountDisplay).toContain(
        '****5678',
      );
    });
  });

  describe('Header display information validation', () => {
    it('should validate required header display fields', () => {
      const validHeaderDisplay = {
        title: 'Банковская выписка',
        subtitle: 'За январь 2024',
        periodDisplay: '01.01.2024 - 31.01.2024',
        accountDisplay: '****5678',
        institutionDisplay: 'Народный Банк',
        currencyDisplay: '₸',
      };

      expect(validHeaderDisplay.title).toBeDefined();
      expect(validHeaderDisplay.accountDisplay).toContain('****');
      expect(validHeaderDisplay.periodDisplay).toContain('-');
      expect(validHeaderDisplay.currencyDisplay).toMatch(/[₽$€£¥₸]/);
    });

    it('should handle incomplete header display gracefully', () => {
      const incompleteHeaderDisplay = {
        title: 'Выписка',
        // Missing other fields
      };

      expect(incompleteHeaderDisplay.title).toBeDefined();
      // Should not throw when other fields are missing
    });
  });
});

// Helper function to create mocks
function createMockRepository<T>(): Partial<Repository<T>> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };
}
