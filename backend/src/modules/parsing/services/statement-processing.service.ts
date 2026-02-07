import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { extractTextFromPdf } from '../../../common/utils/pdf-parser.util';
import { Semaphore } from '../../../common/utils/semaphore.util';
import { ImportSessionMode } from '../../../entities/import-session.entity';
import { BankName, FileType, Statement, StatementStatus } from '../../../entities/statement.entity';
import { Transaction, TransactionType } from '../../../entities/transaction.entity';
import { ClassificationService } from '../../classification/services/classification.service';
import { GoogleSheetsService } from '../../google-sheets/google-sheets.service';
import { ImportSessionService } from '../../import/services/import-session.service';
import { MetricsService } from '../../observability/metrics.service';
import { CrossStatementDeduplicationService } from '../../transactions/services/cross-statement-deduplication.service';
import { TransactionFingerprintService } from '../../transactions/services/transaction-fingerprint.service';
import { AiParseValidator } from '../helpers/ai-parse-validator.helper';
import type { ParsedTransaction } from '../interfaces/parsed-statement.interface';
import type { ParsedStatement } from '../interfaces/parsed-statement.interface';
import { MetadataExtractionService } from './metadata-extraction.service';
import { ParserFactoryService } from './parser-factory.service';

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class StatementProcessingService {
  private readonly logger = new Logger(StatementProcessingService.name);
  private aiValidator = new AiParseValidator();
  private static readonly inFlight = new Map<string, Promise<Statement>>();
  private static readonly parsingSemaphore = new Semaphore(
    parsePositiveInt(process.env.STATEMENT_PARSING_CONCURRENCY, 5),
  );
  private static readonly BALANCE_EPS = (() => {
    const parsed = Number.parseFloat(process.env.BALANCE_EPS || '0.01');
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 0.01;
    }
    return parsed;
  })();

  constructor(
    @InjectRepository(Statement)
    private statementRepository: Repository<Statement>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private parserFactory: ParserFactoryService,
    private classificationService: ClassificationService,
    private metadataExtractionService: MetadataExtractionService,
    private importSessionService: ImportSessionService,
    private transactionFingerprintService: TransactionFingerprintService,
    @Optional()
    @Inject(forwardRef(() => GoogleSheetsService))
    private googleSheetsService?: GoogleSheetsService,
    private metricsService?: MetricsService,
    @Optional()
    private crossStatementDeduplicationService?: CrossStatementDeduplicationService,
  ) {}

  private getFileExtension(statement: Statement): string {
    switch (statement.fileType) {
      case 'pdf':
        return 'pdf';
      case 'xlsx':
        return 'xlsx';
      case 'csv':
        return 'csv';
      case 'image':
        return 'jpg';
      case 'docx':
        return 'docx';
      default:
        return 'bin';
    }
  }

  private async ensureFileAvailable(statement: Statement): Promise<{
    filePath: string;
    tempFilePath?: string;
  }> {
    if (statement.filePath && fs.existsSync(statement.filePath)) {
      return { filePath: statement.filePath };
    }

    const withData = await this.statementRepository
      .createQueryBuilder('statement')
      .addSelect('statement.fileData')
      .where('statement.id = :id', { id: statement.id })
      .getOne();

    let fileData: Buffer | null | undefined = (withData as any)?.fileData;

    if (!fileData && statement.fileHash) {
      const alternative = await this.statementRepository
        .createQueryBuilder('statement')
        .addSelect('statement.fileData')
        .where('statement.userId = :userId', { userId: statement.userId })
        .andWhere('statement.fileHash = :fileHash', {
          fileHash: statement.fileHash,
        })
        .andWhere('statement.fileData IS NOT NULL')
        .orderBy('statement.createdAt', 'DESC')
        .getOne();
      fileData = (alternative as any)?.fileData;
    }

    if (!fileData) {
      throw new Error(`File not found: ${statement.filePath}`);
    }

    const ext = this.getFileExtension(statement);
    const tempFilePath = path.join(
      os.tmpdir(),
      `finflow-statement-${statement.id}-${Date.now()}.${ext}`,
    );
    await fs.promises.writeFile(tempFilePath, fileData);
    return { filePath: tempFilePath, tempFilePath };
  }

  private observeDuration(
    stage: string,
    startedAt: number,
    bank: BankName,
    fileType: FileType,
    result: 'ok' | 'warn' | 'error' = 'ok',
  ) {
    if (!this.metricsService) {
      return;
    }

    const durationSeconds = (Date.now() - startedAt) / 1000;
    this.metricsService.statementParsingDurationSeconds.observe(
      {
        stage,
        bank,
        file_type: fileType,
        result,
      },
      durationSeconds,
    );
  }

  private countError(stage: string, error: unknown) {
    if (!this.metricsService) {
      return;
    }

    const label =
      error instanceof Error
        ? error.name || 'Error'
        : typeof error === 'string'
          ? error
          : 'UnknownError';

    this.metricsService.statementParsingErrorsTotal.inc({
      stage,
      error: label.substring(0, 80),
    });
  }

  private validateStatement(
    metadata: ParsedStatement['metadata'],
    transactions: ParsedTransaction[],
  ): {
    passed: boolean;
    warnings: string[];
    balanceCheck?: {
      expectedEnd?: number;
      actualEnd?: number;
      difference?: number;
      tolerance: number;
    };
  } {
    const warnings: string[] = [];
    const debitSum = transactions.reduce((sum, t) => sum + (t.debit ?? 0), 0);
    const creditSum = transactions.reduce((sum, t) => sum + (t.credit ?? 0), 0);

    let balanceCheck:
      | {
          expectedEnd?: number;
          actualEnd?: number;
          difference?: number;
          tolerance: number;
        }
      | undefined;

    if (
      metadata.balanceStart !== null &&
      metadata.balanceStart !== undefined &&
      metadata.balanceEnd !== null &&
      metadata.balanceEnd !== undefined
    ) {
      const expectedEnd = metadata.balanceStart + creditSum - debitSum;
      const diff = Math.abs(expectedEnd - metadata.balanceEnd);
      balanceCheck = {
        expectedEnd,
        actualEnd: metadata.balanceEnd,
        difference: diff,
        tolerance: StatementProcessingService.BALANCE_EPS,
      };

      if (diff > StatementProcessingService.BALANCE_EPS) {
        warnings.push(
          `Balance mismatch: expected ${expectedEnd.toFixed(2)} got ${metadata.balanceEnd.toFixed(2)} (diff ${diff.toFixed(2)})`,
        );
      }
    }

    return { passed: warnings.length === 0, warnings, balanceCheck };
  }

  private enforceTransactionSchema(
    transactions: ParsedTransaction[],
    defaultCurrency: string,
    log: (level: string, message: string) => void,
    droppedSamples?: Array<{
      reason: string;
      transaction?: Partial<ParsedTransaction>;
    }>,
  ): { valid: ParsedTransaction[]; warnings: string[] } {
    const valid: ParsedTransaction[] = [];
    const warnings: string[] = [];
    const currencyFallback = (defaultCurrency || '').trim() || 'KZT';

    transactions.forEach((tx, index) => {
      const prefix = `tx#${index + 1}`;
      if (!(tx.transactionDate instanceof Date) || Number.isNaN(tx.transactionDate.getTime())) {
        const msg = `${prefix}: skipped (invalid date)`;
        warnings.push(msg);
        log('warn', msg);
        droppedSamples?.push({ reason: msg, transaction: tx });
        return;
      }

      const debit = Number.isFinite(tx.debit as number) ? Number(tx.debit) : 0;
      const credit = Number.isFinite(tx.credit as number) ? Number(tx.credit) : 0;

      if (debit < 0 || credit < 0) {
        const msg = `${prefix}: skipped (negative amount)`;
        warnings.push(msg);
        log('warn', msg);
        droppedSamples?.push({ reason: msg, transaction: tx });
        return;
      }

      if (debit === 0 && credit === 0) {
        const msg = `${prefix}: skipped (no debit/credit amount)`;
        warnings.push(msg);
        log('warn', msg);
        droppedSamples?.push({ reason: msg, transaction: tx });
        return;
      }

      const currency = (tx.currency || currencyFallback).trim() || currencyFallback;
      const sanitized: ParsedTransaction = {
        ...tx,
        transactionDate: tx.transactionDate,
        debit: debit > 0 ? debit : undefined,
        credit: credit > 0 ? credit : undefined,
        currency,
        counterpartyName:
          (tx.counterpartyName || 'Неизвестный контрагент').toString().trim() ||
          'Неизвестный контрагент',
        paymentPurpose: (tx.paymentPurpose || 'Не указано').toString().trim() || 'Не указано',
      };

      valid.push(sanitized);
    });

    return { valid, warnings };
  }

  private reportAi(
    kind: 'extract' | 'validate',
    result: 'success' | 'empty' | 'error' | 'skipped',
  ) {
    if (!this.metricsService) return;
    this.metricsService.aiParsingCallsTotal.inc({ kind, result });
  }

  async processStatement(statementId: string): Promise<Statement> {
    const existing = StatementProcessingService.inFlight.get(statementId);
    if (existing) {
      return existing;
    }

    const runPromise = StatementProcessingService.parsingSemaphore.use(() =>
      this.processStatementInternal(statementId),
    );
    StatementProcessingService.inFlight.set(statementId, runPromise);

    try {
      return await runPromise;
    } finally {
      StatementProcessingService.inFlight.delete(statementId);
    }
  }

  async commitImport(statementId: string): Promise<Statement> {
    const statement = await this.statementRepository.findOne({
      where: { id: statementId },
    });

    if (!statement) {
      throw new Error(`Statement ${statementId} not found`);
    }

    const importPreview = (statement.parsingDetails as any)?.importPreview;
    if (!importPreview?.sessionId) {
      if (statement.status === StatementStatus.COMPLETED) {
        return statement;
      }

      const transactionCount = await this.transactionRepository.count({
        where: { statementId: statement.id },
      });

      if (transactionCount > 0) {
        return statement;
      }
      throw new Error(`Import preview session missing for statement ${statementId}`);
    }

    const transactions = this.hydratePreviewTransactions(importPreview.transactions);
    if (transactions.length === 0) {
      throw new Error(`No preview transactions available for statement ${statementId}`);
    }

    const commitResult = await this.importSessionService.processImport(
      importPreview.sessionId,
      transactions,
      ImportSessionMode.COMMIT,
    );

    if (this.crossStatementDeduplicationService && statement.workspaceId) {
      this.logger.log(`Running cross-statement duplicate detection for ${statementId}...`);
      try {
        const duplicateGroups = await this.crossStatementDeduplicationService.findDuplicates(
          statement.workspaceId,
          statement.id,
          0.85,
        );

        if (duplicateGroups.length > 0) {
          const markedCount =
            await this.crossStatementDeduplicationService.markDuplicates(duplicateGroups);
          statement.parsingDetails = {
            ...(statement.parsingDetails || {}),
            crossStatementDuplicates: {
              groups: duplicateGroups.length,
              marked: markedCount,
            },
          };
        }
      } catch (dedupError) {
        this.logger.warn(`Cross-statement deduplication failed: ${dedupError.message}`);
      }
    }

    const committedTransactions = await this.transactionRepository.find({
      where: { statementId: statement.id },
    });
    statement.totalTransactions = committedTransactions.length;
    statement.totalDebit = committedTransactions.reduce((sum, t) => sum + (t.debit ?? 0), 0);
    statement.totalCredit = committedTransactions.reduce((sum, t) => sum + (t.credit ?? 0), 0);
    statement.status = StatementStatus.COMPLETED;
    statement.processedAt = new Date();
    statement.parsingDetails = {
      ...(statement.parsingDetails || {}),
      importCommit: commitResult.summary,
    } as Statement['parsingDetails'];

    await this.statementRepository.save(statement);

    return statement;
  }

  private async processStatementInternal(statementId: string): Promise<Statement> {
    const startTime = Date.now();
    const parsingDetails: Statement['parsingDetails'] = {
      logEntries: [],
      errors: [],
      warnings: [],
    };

    const addLog = (level: string, message: string) => {
      const timestamp = new Date().toISOString();
      parsingDetails.logEntries = parsingDetails.logEntries || [];
      parsingDetails.logEntries.push({ timestamp, level, message });
      this.logger[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        `[${statementId}] ${message}`,
      );
    };

    const statement = await this.statementRepository.findOne({
      where: { id: statementId },
    });

    if (!statement) {
      throw new Error(`Statement ${statementId} not found`);
    }

    if (statement.status === StatementStatus.PROCESSING) {
      return statement;
    }

    addLog('info', `Starting processing of statement ${statementId}`);
    addLog(
      'info',
      `File: ${statement.fileName} (${statement.fileType}, ${statement.fileSize} bytes)`,
    );

    let tempFilePath: string | undefined;
    let processingFilePath = statement.filePath;

    try {
      const ensured = await this.ensureFileAvailable(statement);
      processingFilePath = ensured.filePath;
      tempFilePath = ensured.tempFilePath;

      // Update status to processing
      statement.status = StatementStatus.PROCESSING;
      statement.parsingDetails = parsingDetails;
      await this.statementRepository.save(statement);

      // Detect bank and format
      addLog('info', `Detecting bank and format for file type: ${statement.fileType}`);
      const detectStartTime = Date.now();
      let cachedText: string | undefined;
      if (statement.fileType === FileType.PDF) {
        try {
          cachedText = await extractTextFromPdf(processingFilePath);
        } catch (error) {
          addLog(
            'warn',
            `PDF text extraction failed before detection: ${(error as Error)?.message}`,
          );
        }
      }
      const { bankName, formatVersion, detectedBy, detectedEvidence, otherBankMentions } =
        await this.parserFactory.detectBankAndFormat(
          processingFilePath,
          statement.fileType,
          cachedText,
        );
      const detectTime = Date.now() - detectStartTime;

      parsingDetails.detectedBank = bankName;
      parsingDetails.detectedFormat = formatVersion;
      parsingDetails.detectedBy = detectedBy;
      parsingDetails.detectedEvidence = detectedEvidence;
      parsingDetails.otherBankMentions = otherBankMentions;
      addLog(
        'info',
        `Detected bank: ${bankName}, format: ${formatVersion || 'unknown'} (${detectTime}ms)`,
      );
      if (detectedBy) {
        addLog('info', `Detected by: ${detectedBy}`);
      }
      if (detectedEvidence?.length) {
        addLog('info', `Detection evidence: ${detectedEvidence.join(', ')}`);
      }
      if (otherBankMentions?.length) {
        addLog('info', `Other bank mentions: ${otherBankMentions.join(', ')}`);
      }
      this.observeDuration('detect', detectStartTime, bankName, statement.fileType, 'ok');

      statement.bankName = bankName;
      await this.statementRepository.save(statement);

      // Get appropriate parser
      addLog('info', `Looking for parser for bank ${bankName} and file type ${statement.fileType}`);
      const parser = await this.parserFactory.getParser(
        bankName,
        statement.fileType,
        processingFilePath,
        cachedText,
      );

      if (!parser) {
        const errorMsg = `No parser found for bank ${bankName} and file type ${statement.fileType}`;
        addLog('error', errorMsg);
        parsingDetails.errors = parsingDetails.errors || [];
        parsingDetails.errors.push(errorMsg);
        throw new Error(errorMsg);
      }

      const parserVersion =
        typeof parser.getVersion === 'function' ? parser.getVersion() : 'unknown';

      parsingDetails.parserUsed = parser.constructor.name;
      parsingDetails.parserVersion = parserVersion;
      addLog('info', `Using parser: ${parser.constructor.name} (version: ${parserVersion})`);

      // Parse statement
      addLog('info', 'Starting PDF text extraction...');
      const parseStartTime = Date.now();
      let parsedStatement = await parser.parse(processingFilePath, cachedText);
      const parseTime = Date.now() - parseStartTime;

      addLog('info', `Parsing completed in ${parseTime}ms`);
      addLog('info', `Found ${parsedStatement.transactions.length} transactions in parsed data`);
      this.observeDuration('parse', parseStartTime, statement.bankName, statement.fileType, 'ok');

      // Extract enhanced metadata from raw text
      addLog('info', 'Extracting statement headers and metadata...');
      const metadataStartTime = Date.now();
      try {
        // Read raw text for metadata extraction
        let rawText = '';
        if (statement.fileType === 'pdf') {
          // For PDF, we might need to extract raw text
          const fs = require('fs');
          if (fs.existsSync(processingFilePath)) {
            // This is a simplified approach - in production, you'd use a PDF text extractor
            rawText = `Extracted from ${statement.fileName}`;
          }
        } else if (statement.fileType === 'csv' || statement.fileType === 'xlsx') {
          // For structured files, we can use the existing data
          rawText = JSON.stringify(parsedStatement);
        }

        // Extract metadata
        const extractedMetadata = await this.metadataExtractionService.extractMetadata(
          rawText,
          parsedStatement.metadata?.locale,
        );

        // Convert and merge metadata
        const displayInfo = this.metadataExtractionService.createDisplayInfo(extractedMetadata);
        const enhancedMetadata =
          this.metadataExtractionService.convertToParsedStatementMetadata(extractedMetadata);

        // Update parsed statement with enhanced metadata
        parsedStatement.metadata = {
          ...parsedStatement.metadata,
          ...enhancedMetadata,
          rawHeader: extractedMetadata.rawHeader,
          normalizedHeader: extractedMetadata.normalizedHeader,
          headerDisplay: {
            title: displayInfo.title,
            subtitle: displayInfo.subtitle,
            periodDisplay: displayInfo.periodDisplay,
            accountDisplay: displayInfo.accountDisplay,
            institutionDisplay: displayInfo.institutionDisplay,
            currencyDisplay: displayInfo.currencyDisplay,
          },
        };

        addLog('info', `Metadata extraction completed in ${Date.now() - metadataStartTime}ms`);
        addLog('info', `Extracted title: "${displayInfo.title}"`);
        if (displayInfo.subtitle) {
          addLog('info', `Extracted subtitle: "${displayInfo.subtitle}"`);
        }
        addLog('info', `Period display: "${displayInfo.periodDisplay}"`);
        addLog('info', `Account display: "${displayInfo.accountDisplay}"`);
        addLog('info', `Institution display: "${displayInfo.institutionDisplay}"`);
      } catch (metadataError) {
        addLog('warn', `Metadata extraction failed: ${metadataError.message}`);
        // Continue without metadata - not a critical error
      }

      // AI reconciliation with PDF text to correct/match results
      const aiEnabled =
        process.env.AI_PARSING_ENABLED === '1' || process.env.AI_PARSING_ENABLED === 'true';
      if (aiEnabled && this.aiValidator.isAvailable()) {
        addLog('info', 'Running AI reconciliation between PDF and parsed result...');
        try {
          const aiResult = await this.aiValidator.reconcileFromPdf(
            processingFilePath,
            parsedStatement,
          );
          parsedStatement = aiResult.corrected;
          if (aiResult.notes.length) {
            aiResult.notes.forEach(note => addLog('info', `[AI] ${note}`));
          }
          addLog(
            'info',
            `After AI reconciliation: ${parsedStatement.transactions.length} transactions`,
          );
          this.reportAi('validate', parsedStatement.transactions.length > 0 ? 'success' : 'empty');
        } catch (aiError) {
          this.reportAi('validate', 'error');
          addLog('warn', `AI reconciliation failed: ${(aiError as Error)?.message}`);
        }
      } else {
        if (!aiEnabled) {
          addLog('info', 'AI reconciliation disabled (set AI_PARSING_ENABLED=1 to enable)');
        } else {
          addLog('info', 'AI reconciliation skipped (no GEMINI_API_KEY set)');
        }
        this.reportAi('validate', 'skipped');
      }

      const droppedSamples: Array<{
        reason: string;
        transaction?: Partial<ParsedTransaction>;
      }> = [];
      const schemaResult = this.enforceTransactionSchema(
        parsedStatement.transactions,
        parsedStatement.metadata?.currency || statement.currency || 'KZT',
        addLog,
        droppedSamples,
      );
      if (schemaResult.warnings.length) {
        parsingDetails.warnings = parsingDetails.warnings || [];
        schemaResult.warnings.forEach(w => parsingDetails.warnings?.push(w));
      }
      parsedStatement.transactions = schemaResult.valid;
      parsingDetails.transactionsFound = parsedStatement.transactions.length;
      parsingDetails.droppedSamples = droppedSamples.slice(0, 10);
      const enrichedMetadata = this.buildCompleteMetadata(
        parsedStatement,
        parsedStatement.transactions,
      );
      parsingDetails.metadataExtracted = {
        accountNumber: enrichedMetadata.accountNumber || undefined,
        dateFrom: enrichedMetadata.dateFrom?.toISOString(),
        dateTo: enrichedMetadata.dateTo?.toISOString(),
        balanceStart: enrichedMetadata.balanceStart ?? undefined,
        balanceEnd: enrichedMetadata.balanceEnd ?? undefined,
        currency: enrichedMetadata.currency,
        rawHeader: parsedStatement.metadata?.rawHeader,
        normalizedHeader: parsedStatement.metadata?.normalizedHeader,
        periodLabel: parsedStatement.metadata?.periodLabel,
        institution: parsedStatement.metadata?.institution,
        locale: parsedStatement.metadata?.locale,
      };

      // Update statement metadata using enriched values to avoid blanks
      statement.accountNumber = enrichedMetadata.accountNumber;
      statement.statementDateFrom = enrichedMetadata.dateFrom;
      statement.statementDateTo = enrichedMetadata.dateTo;
      statement.balanceStart = enrichedMetadata.balanceStart;
      statement.balanceEnd = enrichedMetadata.balanceEnd;
      statement.currency = enrichedMetadata.currency;

      addLog(
        'info',
        `Metadata extracted - Account: ${statement.accountNumber || 'N/A'}, Currency: ${statement.currency}`,
      );
      addLog(
        'info',
        `Date range: ${statement.statementDateFrom?.toISOString() || 'N/A'} to ${statement.statementDateTo?.toISOString() || 'N/A'}`,
      );

      const majorityCategory = await this.classificationService.determineMajorityCategory(
        parsedStatement.transactions,
        statement.userId,
      );

      addLog('info', 'Creating transactions...');
      if (!statement.workspaceId) {
        throw new Error('Statement workspaceId is missing');
      }

      const creationResult = await this.createTransactions(
        statement,
        parsedStatement.transactions,
        statement.userId,
        majorityCategory.categoryId,
        addLog,
      );

      parsingDetails.transactionsCreated = creationResult.transactions.length;
      parsingDetails.transactionsDeduplicated = creationResult.duplicatesSkipped;

      statement.totalTransactions = creationResult.transactions.length;
      statement.totalDebit = creationResult.transactions.reduce(
        (sum, t) => sum + (t.debit ?? 0),
        0,
      );
      statement.totalCredit = creationResult.transactions.reduce(
        (sum, t) => sum + (t.credit ?? 0),
        0,
      );
      if (majorityCategory.categoryId) {
        statement.categoryId = majorityCategory.categoryId;
      }

      addLog('info', `Totals - Debit: ${statement.totalDebit}, Credit: ${statement.totalCredit}`);

      const validationResult = this.validateStatement(
        enrichedMetadata,
        parsedStatement.transactions,
      );
      parsingDetails.validation = {
        passed: validationResult.passed,
        warnings: validationResult.warnings,
        balanceCheck: validationResult.balanceCheck,
      };
      if (validationResult.warnings.length) {
        parsingDetails.warnings = parsingDetails.warnings || [];
        validationResult.warnings.forEach(warning => {
          parsingDetails.warnings?.push(warning);
          addLog('warn', warning);
        });
      }

      const finalStatus = StatementStatus.COMPLETED;

      // Update status
      const totalTime = Date.now() - startTime;
      parsingDetails.processingTime = totalTime;
      statement.status = finalStatus;
      statement.processedAt = new Date();
      statement.parsingDetails = parsingDetails;
      await this.statementRepository.save(statement);
      this.observeDuration(
        'total',
        startTime,
        statement.bankName,
        statement.fileType,
        validationResult.passed ? 'ok' : 'warn',
      );

      addLog(
        'info',
        `Successfully processed statement ${statementId}: ${parsedStatement.transactions.length} transactions (total time: ${totalTime}ms)`,
      );

      // Auto-sync to Google Sheets if connected (async, non-blocking)
      if (statement.googleSheetId && this.googleSheetsService) {
        this.syncToGoogleSheets(statement.googleSheetId, statementId, statement.userId).catch(
          error => {
            this.logger.error(
              `Failed to auto-sync statement ${statementId} to Google Sheets:`,
              error,
            );
            // Don't throw - sync failure shouldn't fail the whole process
          },
        );
      }

      return statement;
    } catch (error) {
      const errorMsg = `Error processing statement ${statementId}: ${error.message}`;
      addLog('error', errorMsg);
      parsingDetails.errors = parsingDetails.errors || [];
      parsingDetails.errors.push(error.message);
      parsingDetails.processingTime = Date.now() - startTime;
      this.countError('processing', error);
      this.observeDuration('total', startTime, statement.bankName, statement.fileType, 'error');

      statement.status = StatementStatus.ERROR;
      statement.errorMessage = error.message;
      statement.parsingDetails = parsingDetails;
      await this.statementRepository.save(statement);

      this.logger.error(`Error processing statement ${statementId}:`, error);
      throw error;
    } finally {
      if (tempFilePath) {
        fs.promises.unlink(tempFilePath).catch(() => undefined);
      }
    }
  }

  private async createTransactions(
    statement: Statement,
    parsedTransactions: ParsedTransaction[],
    userId: string,
    defaultCategoryId: string | undefined,
    addLog?: (level: string, message: string) => void,
  ): Promise<{ transactions: Transaction[]; duplicatesSkipped: number }> {
    const transactions: Transaction[] = [];
    const log =
      addLog ||
      ((level: string, msg: string) => this.logger[level === 'error' ? 'error' : 'log'](msg));

    const seen = new Set<string>();
    const deduped: ParsedTransaction[] = [];
    parsedTransactions.forEach(tx => {
      const dateIso = tx.transactionDate
        ? tx.transactionDate.toISOString().split('T')[0]
        : 'no-date';
      const amount = tx.debit ?? tx.credit ?? 0;
      const signature = [
        dateIso,
        amount.toFixed(2),
        (tx.documentNumber || '').trim().toLowerCase(),
        (tx.counterpartyName || '').trim().toLowerCase(),
        (tx.paymentPurpose || '').trim().toLowerCase(),
      ].join('|');
      if (seen.has(signature)) {
        log('warn', `Duplicate transaction skipped (sig=${signature})`);
        return;
      }
      seen.add(signature);
      deduped.push(tx);
    });

    log(
      'info',
      `Processing ${deduped.length}/${parsedTransactions.length} parsed transactions after dedup (statement currency: ${statement.currency || 'N/A'})`,
    );

    let aiCategoryByIndex = new Map<number, string>();
    if (statement.workspaceId && deduped.length > 0) {
      try {
        aiCategoryByIndex = await this.classificationService.classifyTransactionsBatch(
          deduped.map((parsed, index) => {
            const transactionType =
              parsed.debit && parsed.debit > 0
                ? TransactionType.EXPENSE
                : parsed.credit && parsed.credit > 0
                  ? TransactionType.INCOME
                  : TransactionType.INCOME;

            return {
              index,
              counterpartyName: (parsed.counterpartyName || '').trim() || 'Неизвестный контрагент',
              paymentPurpose: (parsed.paymentPurpose || '').trim() || 'Не указано',
              transactionType,
            };
          }),
          statement.workspaceId,
          userId,
        );

        log(
          'info',
          `AI category matches: ${aiCategoryByIndex.size}/${deduped.length} transactions`,
        );
      } catch (error) {
        log(
          'warn',
          `AI batch categorization failed, fallback to default classification: ${error.message}`,
        );
      }
    }

    for (let i = 0; i < deduped.length; i++) {
      const parsed = deduped[i];

      try {
        const counterpartyName = (parsed.counterpartyName || '').trim() || 'Неизвестный контрагент';
        const paymentPurpose = (parsed.paymentPurpose || '').trim() || 'Не указано';

        // Determine transaction type
        const transactionType =
          parsed.debit && parsed.debit > 0
            ? TransactionType.EXPENSE
            : parsed.credit && parsed.credit > 0
              ? TransactionType.INCOME
              : TransactionType.INCOME;

        // Calculate amount preserving zero values
        const amount = (parsed.debit ?? parsed.credit ?? 0) as number;

        // Classify transaction first (before creating entity)
        const tempTransaction = {
          transactionDate: parsed.transactionDate,
          documentNumber: parsed.documentNumber,
          counterpartyName,
          counterpartyBin: parsed.counterpartyBin,
          counterpartyAccount: parsed.counterpartyAccount,
          counterpartyBank: parsed.counterpartyBank,
          debit: parsed.debit ?? null,
          credit: parsed.credit ?? null,
          amount,
          currency: parsed.currency || statement.currency || 'KZT',
          paymentPurpose,
          transactionType,
          workspaceId: statement.workspaceId,
        } as Transaction;

        const classification = await this.classificationService.classifyTransaction(
          tempTransaction,
          userId,
        );

        if (!classification.categoryId && aiCategoryByIndex.has(i)) {
          classification.categoryId = aiCategoryByIndex.get(i);
        }

        if (!classification.categoryId && defaultCategoryId) {
          classification.categoryId = defaultCategoryId;
        }

        const currency = parsed.currency || statement.currency || 'KZT';
        const exchangeRate = parsed.exchangeRate ?? null;
        const amountForeign = parsed.amountForeign ?? null;

        // Create transaction with classification
        const transaction = this.transactionRepository.create({
          statementId: statement.id,
          workspaceId: statement.workspaceId,
          transactionDate: parsed.transactionDate,
          documentNumber: parsed.documentNumber,
          counterpartyName,
          counterpartyBin: parsed.counterpartyBin,
          counterpartyAccount: parsed.counterpartyAccount,
          counterpartyBank: parsed.counterpartyBank,
          debit: parsed.debit,
          credit: parsed.credit,
          amount,
          currency,
          exchangeRate,
          amountForeign,
          paymentPurpose,
          transactionType,
          ...classification,
        });

        const saved = await this.transactionRepository.save(transaction);
        transactions.push(saved);

        const missing: string[] = [];
        if (!counterpartyName || /неизвест/i.test(counterpartyName)) {
          missing.push('counterparty');
        }
        if (!paymentPurpose || paymentPurpose === 'Не указано') {
          missing.push('purpose');
        }
        if (!classification.categoryId) {
          missing.push('category');
        }
        if (!classification.branchId) {
          missing.push('branch');
        }
        if (!classification.walletId) {
          missing.push('wallet');
        }

        if (missing.length && (i < 5 || i === parsedTransactions.length - 1)) {
          log(
            'warn',
            `Transaction ${i + 1} (${parsed.documentNumber || 'no doc'}): missing ${missing.join(
              ', ',
            )}`,
          );
        } else if (
          classification.categoryId ||
          classification.branchId ||
          classification.walletId
        ) {
          log(
            'info',
            `Transaction ${i + 1} classification -> cat: ${
              classification.categoryId || '—'
            }, branch: ${classification.branchId || '—'}, wallet: ${
              classification.walletId || '—'
            }`,
          );
        }

        if ((i + 1) % 10 === 0) {
          log('info', `Processed ${i + 1}/${deduped.length} transactions`);
        }
      } catch (error) {
        const errorMsg = `Error creating transaction ${i + 1}: ${error.message}`;
        log('error', errorMsg);
        // Continue processing other transactions
      }
    }

    log('info', `Successfully created ${transactions.length}/${deduped.length} transactions`);
    const duplicatesSkipped = parsedTransactions.length - deduped.length;
    return { transactions, duplicatesSkipped };
  }

  /**
   * Sync transactions to Google Sheets (async, non-blocking)
   */
  private async syncToGoogleSheets(
    googleSheetId: string,
    statementId: string,
    userId: string,
  ): Promise<void> {
    if (!this.googleSheetsService) {
      this.logger.warn('GoogleSheetsService not available, skipping sync');
      return;
    }

    try {
      const result = await this.googleSheetsService.syncStatementTransactions(
        googleSheetId,
        statementId,
        userId,
      );
      this.logger.log(
        `Auto-synced ${result.synced} transactions from statement ${statementId} to Google Sheet ${googleSheetId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error auto-syncing statement ${statementId} to Google Sheet ${googleSheetId}:`,
        error,
      );
      // Re-throw to be caught by caller
      throw error;
    }
  }

  private serializePreviewTransactions(
    transactions: ParsedTransaction[],
  ): Array<Omit<ParsedTransaction, 'transactionDate'> & { transactionDate: string }> {
    return transactions.map(tx => ({
      ...tx,
      transactionDate: tx.transactionDate.toISOString(),
    }));
  }

  private hydratePreviewTransactions(raw: unknown): ParsedTransaction[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return (raw as Array<Omit<ParsedTransaction, 'transactionDate'> & { transactionDate?: string }>)
      .map(tx => ({
        ...tx,
        transactionDate: tx.transactionDate ? new Date(tx.transactionDate) : new Date('invalid'),
      }))
      .filter(
        tx => tx.transactionDate instanceof Date && !Number.isNaN(tx.transactionDate.getTime()),
      );
  }

  private buildCompleteMetadata(
    parsed: ParsedStatement,
    transactions: ParsedTransaction[],
  ): {
    accountNumber: string;
    dateFrom: Date;
    dateTo: Date;
    balanceStart: number | null | undefined;
    balanceEnd: number | null | undefined;
    currency: string;
  } {
    const transactionDates = transactions.map(t => t.transactionDate).filter((d): d is Date => !!d);

    const minDate =
      transactionDates.length > 0
        ? new Date(Math.min(...transactionDates.map(d => d.getTime())))
        : null;
    const maxDate =
      transactionDates.length > 0
        ? new Date(Math.max(...transactionDates.map(d => d.getTime())))
        : null;

    const fallbackAccount =
      transactions.find(t => t.counterpartyAccount)?.counterpartyAccount ||
      transactions.find(t => t.counterpartyBin)?.counterpartyBin ||
      'Unknown';

    const currencyFromTransactions = transactions.find(t => t.currency)?.currency;

    const accountNumber = (parsed.metadata.accountNumber || '').trim() || fallbackAccount;
    const dateFrom = parsed.metadata.dateFrom || minDate || new Date();
    const dateTo = parsed.metadata.dateTo || maxDate || dateFrom;
    const balanceStart = parsed.metadata.balanceStart ?? null;
    const balanceEnd = parsed.metadata.balanceEnd ?? null;
    const currency = parsed.metadata.currency || currencyFromTransactions || 'KZT';

    return {
      accountNumber,
      dateFrom,
      dateTo,
      balanceStart,
      balanceEnd,
      currency,
    };
  }
}
