import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataQualityFramework } from '../../common/utils/data-quality-framework.util';
import { ParsingRule } from '../../entities/parsing-rule.entity';
import { Statement } from '../../entities/statement.entity';
import { Transaction } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { ClassificationModule } from '../classification/classification.module';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { ImportModule } from '../import/import.module';
import { ObservabilityModule } from '../observability/observability.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { ParsingController } from './controllers/parsing.controller';
import { AiDocumentExtractor } from './helpers/ai-document-extractor.helper';
import { BankProfileService } from './services/bank-profile.service';
import { ChecksumAutoFixService } from './services/checksum-auto-fix.service';
import { ChecksumValidationService } from './services/checksum-validation.service';
import { ColumnAutoFixService } from './services/column-auto-fix.service';
import { ColumnValidationService } from './services/column-validation.service';
import { DocumentClassifierService } from './services/document-classifier.service';
import { FeatureFlagService } from './services/feature-flag.service';
import { IntelligentDeduplicationService } from './services/intelligent-deduplication.service';
import { MetadataExtractionService } from './services/metadata-extraction.service';
import { OcrService } from './services/ocr.service';
import { ParserFactoryService } from './services/parser-factory.service';
import { ParsingRulesService } from './services/parsing-rules.service';
import { ProfileConfigService } from './services/profile-config.service';
import { QualityLoggingService } from './services/quality-logging.service';
import { QualityMetricsService } from './services/quality-metrics.service';
import { StatementNormalizationService } from './services/statement-normalization.service';
import { StatementProcessingService } from './services/statement-processing.service';
import { TextCleaningService } from './services/text-cleaning.service';
import { TransactionNormalizer } from './services/transaction-normalizer.service';
import { TransactionTypeDetectorService } from './services/transaction-type-detector.service';
import { UniversalAmountParser } from './services/universal-amount-parser.service';
import { UniversalDateParser } from './services/universal-date-parser.service';
import { UniversalExtractorService } from './services/universal-extractor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Statement, Transaction, ParsingRule, User]),
    ClassificationModule,
    forwardRef(() => GoogleSheetsModule),
    forwardRef(() => ImportModule),
    ObservabilityModule,
    forwardRef(() => TransactionsModule),
  ],
  controllers: [ParsingController],
  providers: [
    ParserFactoryService,
    StatementProcessingService,
    ParsingRulesService,
    StatementNormalizationService,
    TransactionNormalizer,
    UniversalDateParser,
    UniversalAmountParser,
    TextCleaningService,
    ColumnValidationService,
    ChecksumValidationService,
    QualityLoggingService,
    MetadataExtractionService,
    ColumnAutoFixService,
    ChecksumAutoFixService,
    BankProfileService,
    FeatureFlagService,
    IntelligentDeduplicationService,
    QualityMetricsService,
    ProfileConfigService,
    DataQualityFramework,
    DocumentClassifierService,
    OcrService,
    TransactionTypeDetectorService,
    UniversalExtractorService,
    {
      provide: 'AI_DOCUMENT_EXTRACTOR',
      useFactory: () => new AiDocumentExtractor(process.env.GEMINI_API_KEY),
    },
  ],
  exports: [
    ParserFactoryService,
    StatementProcessingService,
    ParsingRulesService,
    StatementNormalizationService,
    TransactionNormalizer,
    UniversalDateParser,
    UniversalAmountParser,
    TextCleaningService,
    ColumnValidationService,
    ChecksumValidationService,
    QualityLoggingService,
    MetadataExtractionService,
    ColumnAutoFixService,
    ChecksumAutoFixService,
    BankProfileService,
    FeatureFlagService,
    IntelligentDeduplicationService,
    QualityMetricsService,
    DataQualityFramework,
    DocumentClassifierService,
    OcrService,
    TransactionTypeDetectorService,
    UniversalExtractorService,
  ],
})
export class ParsingModule {}
