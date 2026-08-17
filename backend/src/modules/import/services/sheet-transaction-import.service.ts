import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CategoryType } from '../../../entities/category.entity';
import { ImportSession, ImportSessionMode } from '../../../entities/import-session.entity';
import { BankName, FileType, Statement, StatementStatus } from '../../../entities/statement.entity';
import { Transaction, TransactionType } from '../../../entities/transaction.entity';
import { Wallet } from '../../../entities/wallet.entity';
import { ClassificationService } from '../../classification/services/classification.service';
import { CustomTableImportJobsService } from '../../custom-tables/custom-table-import-jobs.service';
import { GoogleSheetsImportLayoutType } from '../../custom-tables/dto/google-sheets-import-preview.dto';
import {
  type LoadedSheetSource,
  SheetSourceLoaderService,
  numberToColumnLetters,
} from '../../google-sheets/services/sheet-source-loader.service';
import type { ParsedTransaction } from '../../parsing/interfaces/parsed-statement.interface';
import { TransactionFingerprintService } from '../../transactions/services/transaction-fingerprint.service';
import type { SheetColumnRole } from '../sheets/column-roles';
import { detectColumnRoles } from '../sheets/detect-column-roles.util';
import { detectLayout } from '../sheets/detect-layout.util';
import { type MappedSheetRow, type SheetMapping, mapSheetRows } from '../sheets/map-sheet-rows';
import { SheetCurrencyService } from '../sheets/sheet-currency.service';
import { SheetReferenceResolverService } from '../sheets/sheet-reference-resolver.service';
import { ImportSessionService } from './import-session.service';

/** Input shared by preview and commit: identifies the sheet and how to map it. */
export interface SheetTransactionPreviewInput {
  googleSheetId?: string;
  sourceUrl?: string;
  worksheetName?: string;
  range?: string;
  headerRowIndex?: number;
  /** Explicit column roles, overriding auto-detection. Must match the sheet's column count. */
  roles?: SheetColumnRole[];
  defaultCurrency: string;
  skipRowNumbers?: number[];
  invertSign?: boolean;
  /** Display name used for the session's fileName; defaults to a generic label. */
  name?: string;
}

export interface SheetTransactionCommitInput extends SheetTransactionPreviewInput {
  /** Used to build the synthetic Statement's fileName. */
  name: string;
  /** Whether unresolved category names should be created rather than left unset. */
  categoryCreateMissing?: boolean;
  /** Wallet name to resolve for currency + (future) wallet assignment. */
  walletName?: string;
}

export interface SheetTransactionColumnPreview {
  index: number;
  a1: string;
  title: string;
  suggestedRole: SheetColumnRole;
  samples: string[];
}

export interface SheetTransactionPreviewRow extends MappedSheetRow {
  /** Per-row classification merged in from ImportSessionService's preview pass, `ok` rows only. */
  sessionStatus?: 'new' | 'matched' | 'conflicted' | 'failed';
  /** Id of the pre-existing transaction this row matched/conflicted against, `matched`/`conflicted` rows only. */
  existingTransactionId?: string;
}

export interface SheetTransactionPreviewResult {
  sessionId: string;
  suggestedMapping: SheetMapping;
  columns: SheetTransactionColumnPreview[];
  rows: SheetTransactionPreviewRow[];
  summary: {
    total: number;
    ok: number;
    invalid: number;
    skipped: number;
    newCount: number;
    duplicateCount: number;
    warnings: string[];
    dateRange: { from: string; to: string } | null;
    totals: { debit: number; credit: number; currency: string };
  };
}

export interface SheetTransactionCommitResult {
  statementId: string;
  imported: number;
  skipped: number;
  duplicates: number;
  warnings: string[];
}

/** Result of loading + mapping a sheet, shared by preview() and runCommit(). */
interface LoadedAndMappedSheet {
  loaded: LoadedSheetSource;
  columns: SheetTransactionColumnPreview[];
  mapping: SheetMapping;
  mapped: { rows: MappedSheetRow[]; summary: { ok: number; invalid: number; skipped: number } };
  fileHash: string;
}

const SAMPLE_ROW_COUNT = 5;
const PREVIEW_ROW_LIMIT = 100;

/** A row's transaction type for AI classification: credit present -> income, else expense. */
const buildBatchClassificationType = (transaction: ParsedTransaction): TransactionType =>
  (transaction.credit ?? 0) > 0 ? TransactionType.INCOME : TransactionType.EXPENSE;

/**
 * Orchestrates the Google Sheets -> transactions import: loads the sheet,
 * maps rows, resolves category/wallet references and FX, and delegates
 * duplicate detection + persistence to `ImportSessionService`. Does not
 * reimplement fingerprinting or dedup — those live in `ImportSessionService`
 * / `TransactionFingerprintService`.
 */
@Injectable()
export class SheetTransactionImportService {
  private readonly logger = new Logger(SheetTransactionImportService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Statement)
    private readonly statementRepository: Repository<Statement>,
    @InjectRepository(ImportSession)
    private readonly importSessionRepository: Repository<ImportSession>,
    private readonly sheetSourceLoader: SheetSourceLoaderService,
    private readonly importSessionService: ImportSessionService,
    private readonly sheetReferenceResolver: SheetReferenceResolverService,
    private readonly sheetCurrencyService: SheetCurrencyService,
    private readonly classificationService: ClassificationService,
    private readonly customTableImportJobsService: CustomTableImportJobsService,
    private readonly fingerprintService: TransactionFingerprintService,
  ) {}

  /**
   * Loads the sheet, rejects matrix layouts, detects/applies column roles,
   * and maps rows. Shared by `preview()` and `runCommit()` so the two never
   * drift apart on how a sheet is interpreted.
   */
  private async loadAndMapSheet(
    dto: SheetTransactionPreviewInput,
    workspaceId: string,
  ): Promise<LoadedAndMappedSheet> {
    const loaded = await this.sheetSourceLoader.load({
      googleSheetId: dto.googleSheetId,
      sourceUrl: dto.sourceUrl,
      worksheetName: dto.worksheetName,
      range: dto.range,
      workspaceId,
    });

    const headerRowIndex = dto.headerRowIndex ?? 0;
    const layout = detectLayout(loaded.values, headerRowIndex);
    if (layout === GoogleSheetsImportLayoutType.MATRIX) {
      throw new BadRequestException(
        'Матричные листы пока не поддерживаются для импорта транзакций',
      );
    }

    const headerRow = loaded.values[headerRowIndex] ?? [];
    const dataRows = loaded.values.slice(headerRowIndex + 1);

    const columnInputs = headerRow.map((cell, index) => ({
      title: cell === null || cell === undefined ? '' : String(cell).trim(),
      samples: dataRows.slice(0, SAMPLE_ROW_COUNT).map(row => row[index]),
    }));

    const detectedRoles = detectColumnRoles(columnInputs);
    const effectiveRoles = dto.roles ?? detectedRoles;

    const columns: SheetTransactionColumnPreview[] = columnInputs.map((column, index) => ({
      index,
      a1: numberToColumnLetters(index + 1),
      title: column.title,
      suggestedRole: detectedRoles[index] ?? 'ignore',
      samples: column.samples.map(sample =>
        sample === null || sample === undefined ? '' : String(sample),
      ),
    }));

    const mapping: SheetMapping = {
      roles: effectiveRoles,
      defaultCurrency: dto.defaultCurrency,
      skipRowNumbers: dto.skipRowNumbers,
      invertSign: dto.invertSign,
    };

    const mapped = mapSheetRows(dataRows, mapping);

    const fileHash = createHash('sha256')
      .update(loaded.spreadsheetId + loaded.worksheetName + loaded.effectiveRange)
      .update(JSON.stringify(loaded.values))
      .digest('hex');

    return { loaded, columns, mapping, mapped, fileHash };
  }

  /** `ok` rows + a parallel index back into `rows` for each transaction, in the same order. */
  private buildOkTransactions(rows: MappedSheetRow[]): {
    transactions: ParsedTransaction[];
    rowIndexes: number[];
  } {
    const transactions: ParsedTransaction[] = [];
    const rowIndexes: number[] = [];
    rows.forEach((row, index) => {
      if (row.status === 'ok' && row.transaction) {
        transactions.push(row.transaction);
        rowIndexes.push(index);
      }
    });
    return { transactions, rowIndexes };
  }

  async preview(
    workspaceId: string,
    userId: string,
    dto: SheetTransactionPreviewInput,
  ): Promise<SheetTransactionPreviewResult> {
    const { columns, mapping, mapped, fileHash } = await this.loadAndMapSheet(dto, workspaceId);

    const session = await this.importSessionService.createSession(
      workspaceId,
      userId,
      null,
      ImportSessionMode.PREVIEW,
      fileHash,
      dto.name ?? 'Google Sheet import',
      0,
    );

    const { transactions: okTransactions, rowIndexes } = this.buildOkTransactions(mapped.rows);
    const processResult = await this.importSessionService.processImport(
      session.id,
      okTransactions,
      ImportSessionMode.PREVIEW,
    );

    const rows = await this.mergeSessionClassifications(session.id, mapped.rows, rowIndexes);

    const summary = this.buildPreviewSummary(mapped, okTransactions, processResult, mapping);

    return {
      sessionId: session.id,
      suggestedMapping: mapping,
      columns,
      rows: rows.slice(0, PREVIEW_ROW_LIMIT),
      summary,
    };
  }

  /** Fetches the session's per-index preview classifications and merges them onto ok rows. */
  private async mergeSessionClassifications(
    sessionId: string,
    rows: MappedSheetRow[],
    rowIndexes: number[],
  ): Promise<SheetTransactionPreviewRow[]> {
    const session = await this.importSessionService.getSession(sessionId);
    const classifications = session.sessionMetadata?.previewData?.classifications ?? [];
    const classificationByOkIndex = new Map(classifications.map(c => [c.index, c]));

    const merged: SheetTransactionPreviewRow[] = rows.map(row => ({ ...row }));
    rowIndexes.forEach((rowIndex, okIndex) => {
      const classification = classificationByOkIndex.get(okIndex);
      if (classification && classification.status !== 'skipped') {
        merged[rowIndex].sessionStatus = classification.status;
        merged[rowIndex].existingTransactionId = classification.existingTransactionId;
      }
    });
    return merged;
  }

  private buildPreviewSummary(
    mapped: LoadedAndMappedSheet['mapped'],
    okTransactions: ParsedTransaction[],
    processResult: Awaited<ReturnType<ImportSessionService['processImport']>>,
    mapping: SheetMapping,
  ): SheetTransactionPreviewResult['summary'] {
    const total = mapped.summary.ok + mapped.summary.invalid + mapped.summary.skipped;
    const dateRange = this.computeDateRange(okTransactions);
    const totals = this.computeTotals(okTransactions, mapping.defaultCurrency);

    return {
      total,
      ok: mapped.summary.ok,
      invalid: mapped.summary.invalid,
      skipped: mapped.summary.skipped,
      newCount: processResult.summary.newCount,
      duplicateCount: processResult.summary.matchedCount + processResult.summary.conflictedCount,
      warnings: processResult.summary.warnings,
      dateRange,
      totals,
    };
  }

  private computeDateRange(transactions: ParsedTransaction[]): { from: string; to: string } | null {
    if (transactions.length === 0) {
      return null;
    }
    const times = transactions.map(t => t.transactionDate.getTime());
    return {
      from: new Date(Math.min(...times)).toISOString().slice(0, 10),
      to: new Date(Math.max(...times)).toISOString().slice(0, 10),
    };
  }

  private computeTotals(
    transactions: ParsedTransaction[],
    currency: string,
  ): { debit: number; credit: number; currency: string } {
    let debit = 0;
    let credit = 0;
    for (const t of transactions) {
      debit += t.debit ?? 0;
      credit += t.credit ?? 0;
    }
    return { debit, credit, currency };
  }

  /**
   * Thin: builds a job payload and enqueues it. The actual import work
   * happens in `runCommit()`, invoked later by the queued job's processor.
   */
  async commit(
    workspaceId: string,
    userId: string,
    dto: SheetTransactionCommitInput,
  ): Promise<{ jobId: string }> {
    const job = await this.customTableImportJobsService.createSheetTransactionsJob(userId, {
      ...dto,
      workspaceId,
    });
    return { jobId: job.id };
  }

  async runCommit(
    workspaceId: string,
    userId: string,
    dto: SheetTransactionCommitInput,
  ): Promise<SheetTransactionCommitResult> {
    const { loaded, mapping, mapped, fileHash } = await this.loadAndMapSheet(dto, workspaceId);
    const { transactions: okTransactions, rowIndexes } = this.buildOkTransactions(mapped.rows);

    if (okTransactions.length === 0) {
      throw new BadRequestException('Нет строк для импорта');
    }

    const walletCurrency = await this.resolveWalletCurrency(workspaceId, dto);
    const categoryResolution = await this.resolveRowCategories(
      workspaceId,
      userId,
      mapped.rows,
      rowIndexes,
      mapping,
      dto.categoryCreateMissing ?? false,
    );
    const fxResult = await this.sheetCurrencyService.convertRows(mapped.rows, walletCurrency);

    const { statement, processResult } = await this.commitStatementAndSession(
      workspaceId,
      userId,
      dto,
      loaded,
      okTransactions,
      fileHash,
      walletCurrency,
    );

    // Statement + Transaction rows are already durably committed at this point
    // (commitStatementAndSession resolved successfully above). Categorization is
    // best-effort enrichment, not critical-path for the ledger write — a failure
    // here must never fail the whole commit or trigger any compensating rollback.
    const categorizationWarnings = await this.runPostCommitCategorization(
      workspaceId,
      userId,
      statement,
      okTransactions,
      rowIndexes,
      categoryResolution,
    );

    const skipped =
      mapped.summary.invalid + mapped.summary.skipped + processResult.summary.skippedCount;
    const duplicates = processResult.summary.matchedCount + processResult.summary.conflictedCount;
    const warnings = [
      ...processResult.summary.warnings,
      ...fxResult.warnings,
      ...categorizationWarnings,
    ];

    return {
      statementId: statement.id,
      imported: processResult.summary.newCount,
      skipped,
      duplicates,
      warnings,
    };
  }

  /** Resolves the target currency for FX conversion: the named wallet's currency, or the default. */
  private async resolveWalletCurrency(
    workspaceId: string,
    dto: SheetTransactionCommitInput,
  ): Promise<string> {
    if (!dto.walletName?.trim()) {
      return dto.defaultCurrency;
    }

    const { resolved } = await this.sheetReferenceResolver.resolveWallets({
      workspaceId,
      names: [dto.walletName],
    });
    const walletId = resolved.get(dto.walletName.trim().toLowerCase());
    if (!walletId) {
      return dto.defaultCurrency;
    }

    const wallet = await this.walletRepository.findOne({ where: { id: walletId, workspaceId } });
    return wallet?.currency ?? dto.defaultCurrency;
  }

  /**
   * Resolves category names from the sheet's `category` column (if mapped) to
   * category ids, keyed by row index. `ParsedTransaction` carries no category
   * field, so this can't be threaded into `processImport` — it's applied as
   * a follow-up update after commit, in `applyPostCommitCategorization`.
   */
  private async resolveRowCategories(
    workspaceId: string,
    userId: string,
    rows: MappedSheetRow[],
    rowIndexes: number[],
    mapping: SheetMapping,
    createMissing: boolean,
  ): Promise<Map<number, string>> {
    const resolvedByRowIndex = new Map<number, string>();
    const categoryColumnIndex = mapping.roles.indexOf('category');
    if (categoryColumnIndex < 0) {
      return resolvedByRowIndex;
    }

    const namesByRowIndex = new Map<number, { name: string; type: CategoryType }>();
    for (const rowIndex of rowIndexes) {
      const row = rows[rowIndex];
      const rawName = row.raw[categoryColumnIndex];
      if (!rawName?.trim()) {
        continue;
      }
      const type = (row.transaction?.credit ?? 0) > 0 ? CategoryType.INCOME : CategoryType.EXPENSE;
      namesByRowIndex.set(rowIndex, { name: rawName.trim(), type });
    }

    if (namesByRowIndex.size === 0) {
      return resolvedByRowIndex;
    }

    const resolved = await this.sheetReferenceResolver.resolveCategories({
      workspaceId,
      userId,
      names: Array.from(namesByRowIndex.values()),
      createMissing,
    });

    for (const [rowIndex, { name, type }] of namesByRowIndex) {
      const key = `${type}:${name.trim().toLowerCase()}`;
      const categoryId = resolved.get(key);
      if (categoryId) {
        resolvedByRowIndex.set(rowIndex, categoryId);
      }
    }

    return resolvedByRowIndex;
  }

  /**
   * Creates the synthetic Statement and runs the import session, then
   * compensates (deletes the statement, resets the session) if
   * `processImport` fails.
   *
   * This is NOT a spanning DB transaction: `ImportSessionService.processCommit`
   * always opens its own independent `QueryRunner` for inserting `Transaction`
   * rows (see import-session.service.ts:576), and reads the session via its
   * own plain repository — never a queryRunner a caller supplies. A write made
   * on our own queryRunner's uncommitted connection would be invisible to that
   * read (different pooled connection, READ COMMITTED isolation), so a
   * spanning transaction here couldn't work correctly even if we tried it.
   * `processImport` already guarantees its own `Transaction` inserts are
   * all-or-nothing internally, so the only thing left for us to guarantee is:
   * no orphan Statement (and no session left pointing at one with zero
   * imported transactions) if `processImport` fails. Plain committed writes +
   * an explicit compensating delete/reset achieve that, at the cost of a
   * narrow crash window between the failure and the compensation completing
   * — an acceptable, detectable leftover row, not corrupted ledger data.
   */
  private async commitStatementAndSession(
    workspaceId: string,
    userId: string,
    dto: SheetTransactionCommitInput,
    loaded: LoadedSheetSource,
    okTransactions: ParsedTransaction[],
    fileHash: string,
    currency: string,
  ): Promise<{
    statement: Statement;
    processResult: Awaited<ReturnType<ImportSessionService['processImport']>>;
  }> {
    const dateRange = this.computeDateRange(okTransactions);
    const statement = this.statementRepository.create({
      userId,
      workspaceId,
      googleSheetId: dto.googleSheetId ?? null,
      fileName: `${dto.name} · ${loaded.worksheetName}`,
      filePath: dto.sourceUrl ?? `gsheet://${loaded.spreadsheetId}/${loaded.worksheetName}`,
      fileType: FileType.XLSX,
      fileSize: 0,
      fileHash,
      bankName: BankName.OTHER,
      accountNumber: null,
      statementDateFrom: dateRange ? new Date(dateRange.from) : null,
      statementDateTo: dateRange ? new Date(dateRange.to) : null,
      status: StatementStatus.COMPLETED,
      currency,
    });
    const savedStatement = await this.statementRepository.save(statement);

    const session = await this.importSessionService.createSession(
      workspaceId,
      userId,
      savedStatement.id,
      ImportSessionMode.COMMIT,
      fileHash,
      savedStatement.fileName,
      0,
    );

    // createSession() is idempotent by fileHash: if preview() already created a session
    // for this exact sheet content, that PREVIEW-status session is returned unchanged —
    // savedStatement.id above is silently discarded, leaving session.statementId at
    // whatever it was (null, from preview()'s createSession(..., null, ...) call).
    // Explicitly reassociate it here so processImport persists transactions against the
    // statement actually created in this commit, not an orphaned null.
    const statementIdNeedsFixup = session.statementId !== savedStatement.id;
    if (statementIdNeedsFixup) {
      await this.importSessionRepository.update(
        { id: session.id },
        { statementId: savedStatement.id },
      );
    }

    try {
      const processResult = await this.importSessionService.processImport(
        session.id,
        okTransactions,
        ImportSessionMode.COMMIT,
      );
      return { statement: savedStatement, processResult };
    } catch (error) {
      await this.statementRepository.delete(savedStatement.id);
      if (statementIdNeedsFixup) {
        await this.importSessionRepository.update({ id: session.id }, { statementId: null });
      }
      throw error;
    }
  }

  /** Same deterministic fingerprint `ImportSessionService` computed at insert time. */
  private computeFingerprint(
    workspaceId: string,
    transaction: ParsedTransaction,
    accountNumber: string,
  ): string {
    return this.fingerprintService.generateFingerprint(
      {
        ...transaction,
        workspaceId,
        amount: transaction.debit || transaction.credit || null,
        currency: transaction.currency || 'KZT',
      },
      accountNumber,
    );
  }

  /**
   * `applyPostCommitCategorization` (best-effort enrichment) can throw — a
   * classifier outage or an unexpected shape from `classifyTransactionsBatch`
   * must never fail an already-successful commit, and must never be allowed
   * to reach `commitStatementAndSession`'s compensating-rollback path (that
   * path is only for a failed `processImport`, not for enrichment run after
   * the commit already succeeded). Caught here, logged, and surfaced as a
   * warning instead of an exception.
   */
  private async runPostCommitCategorization(
    workspaceId: string,
    userId: string,
    statement: Statement,
    okTransactions: ParsedTransaction[],
    rowIndexes: number[],
    categoryByRowIndex: Map<number, string>,
  ): Promise<string[]> {
    try {
      await this.applyPostCommitCategorization(
        workspaceId,
        userId,
        statement,
        okTransactions,
        rowIndexes,
        categoryByRowIndex,
      );
      return [];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Post-commit categorization failed for statement ${statement.id}: ${message}`,
      );
      return ['category_classification_failed'];
    }
  }

  /** Fingerprints shared by 2+ `okTransactions` — see `applyResolvedSheetCategories`. */
  private findAmbiguousFingerprints(
    workspaceId: string,
    accountNumber: string,
    transactions: ParsedTransaction[],
  ): Set<string> {
    const counts = new Map<string, number>();
    for (const transaction of transactions) {
      const fingerprint = this.computeFingerprint(workspaceId, transaction, accountNumber);
      counts.set(fingerprint, (counts.get(fingerprint) ?? 0) + 1);
    }
    const ambiguous = new Set<string>();
    for (const [fingerprint, count] of counts) {
      if (count > 1) {
        ambiguous.add(fingerprint);
      }
    }
    return ambiguous;
  }

  /**
   * Applies resolved sheet categories, then AI-classifies the remainder,
   * matching persisted transactions to original rows by fingerprint. Runs
   * after the commit — enrichment is not critical-path for the ledger write
   * itself (see `runPostCommitCategorization`, which isolates failures here).
   */
  private async applyPostCommitCategorization(
    workspaceId: string,
    userId: string,
    statement: Statement,
    okTransactions: ParsedTransaction[],
    rowIndexes: number[],
    categoryByRowIndex: Map<number, string>,
  ): Promise<void> {
    const accountNumber = statement.accountNumber || '';
    const persisted = await this.transactionRepository.find({
      where: { statementId: statement.id, workspaceId },
    });
    const persistedByFingerprint = new Map(persisted.map(t => [t.fingerprint, t]));

    // TransactionFingerprintService hashes only (workspace, account, date, amount,
    // currency, direction, counterparty) — no row/document identifier. Two distinct
    // sheet rows that are content-identical (e.g. two separate same-day, same-amount
    // purchases at the same merchant) collide on fingerprint, so the map above can't
    // tell them apart. Applying a category by fingerprint match for those rows risks
    // silently categorizing the WRONG persisted transaction — skip categorization for
    // any row whose fingerprint is ambiguous entirely, rather than risk that.
    const ambiguousFingerprints = this.findAmbiguousFingerprints(
      workspaceId,
      accountNumber,
      okTransactions,
    );

    const needsClassification = await this.applyResolvedSheetCategories(
      workspaceId,
      accountNumber,
      okTransactions,
      rowIndexes,
      categoryByRowIndex,
      persistedByFingerprint,
      ambiguousFingerprints,
    );

    if (needsClassification.length === 0) {
      return;
    }

    await this.classifyAndApplyRemaining(
      workspaceId,
      userId,
      accountNumber,
      okTransactions,
      rowIndexes,
      needsClassification,
      persistedByFingerprint,
    );
  }

  /** Applies sheet-resolved categories; returns the AI-classification batch input for the rest. */
  private async applyResolvedSheetCategories(
    workspaceId: string,
    accountNumber: string,
    okTransactions: ParsedTransaction[],
    rowIndexes: number[],
    categoryByRowIndex: Map<number, string>,
    persistedByFingerprint: Map<string | null, Transaction>,
    ambiguousFingerprints: Set<string>,
  ): Promise<
    Array<{
      index: number;
      counterpartyName: string;
      paymentPurpose: string;
      transactionType: TransactionType;
    }>
  > {
    const needsClassification: Array<{
      index: number;
      counterpartyName: string;
      paymentPurpose: string;
      transactionType: TransactionType;
    }> = [];

    for (let i = 0; i < okTransactions.length; i++) {
      const transaction = okTransactions[i];
      const rowIndex = rowIndexes[i];
      const fingerprint = this.computeFingerprint(workspaceId, transaction, accountNumber);

      if (ambiguousFingerprints.has(fingerprint)) {
        // Can't safely tell which persisted row this is among its fingerprint
        // collision group — no category application (sheet-resolved or AI) for it.
        continue;
      }

      const persistedTransaction = persistedByFingerprint.get(fingerprint);
      if (!persistedTransaction) {
        continue;
      }

      const resolvedCategoryId = categoryByRowIndex.get(rowIndex);
      if (resolvedCategoryId) {
        await this.transactionRepository.update(
          { id: persistedTransaction.id },
          { categoryId: resolvedCategoryId },
        );
        continue;
      }

      needsClassification.push({
        index: rowIndex,
        counterpartyName: transaction.counterpartyName,
        paymentPurpose: transaction.paymentPurpose,
        transactionType: buildBatchClassificationType(transaction),
      });
    }

    return needsClassification;
  }

  /** Runs AI classification for the rows the sheet didn't resolve, and applies the results. */
  private async classifyAndApplyRemaining(
    workspaceId: string,
    userId: string,
    accountNumber: string,
    okTransactions: ParsedTransaction[],
    rowIndexes: number[],
    needsClassification: Array<{
      index: number;
      counterpartyName: string;
      paymentPurpose: string;
      transactionType: TransactionType;
    }>,
    persistedByFingerprint: Map<string | null, Transaction>,
  ): Promise<void> {
    const aiResults = await this.classificationService.classifyTransactionsBatch(
      needsClassification,
      workspaceId,
      userId,
    );

    for (let i = 0; i < okTransactions.length; i++) {
      const rowIndex = rowIndexes[i];
      const aiResult = aiResults.get(rowIndex);
      if (!aiResult) {
        continue;
      }
      const transaction = okTransactions[i];
      const fingerprint = this.computeFingerprint(workspaceId, transaction, accountNumber);
      const persistedTransaction = persistedByFingerprint.get(fingerprint);
      if (!persistedTransaction) {
        continue;
      }
      await this.transactionRepository.update(
        { id: persistedTransaction.id },
        { categoryId: aiResult.categoryId },
      );
    }
  }
}
