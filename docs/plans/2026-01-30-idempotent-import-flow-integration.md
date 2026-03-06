# Idempotent Import Flow Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate the import session preview/commit workflow into the statement processing pipeline with fuzzy conflict detection, API endpoints, frontend UI, and comprehensive integration tests.

**Architecture:**
- Refactor `StatementProcessingService` to use `ImportSessionService` for preview/commit workflow instead of direct transaction creation
- Enhance `ImportSessionService.processPreview()` to load candidate existing transactions for fuzzy matching, not just exact fingerprint matches
- Add REST endpoints for import preview, conflict review, and commit operations
- Create frontend UI for reviewing conflicts and committing imports
- Add integration tests covering the full end-to-end import flow

**Tech Stack:** NestJS, TypeORM, React 19, Next.js 14, TanStack Table, Jest

---

## Task 1: Extend ImportSessionService with Fuzzy Conflict Detection

**Files:**
- Modify: `backend/src/modules/import/services/import-session.service.ts:317-397`
- Test: `backend/@tests/unit/modules/import/services/import-session.service.spec.ts`

### Step 1: Write failing test for fuzzy conflict detection

Add test case to verify that `processPreview` loads candidate existing transactions by date/amount window, not just exact fingerprint matches.

```typescript
// In backend/@tests/unit/modules/import/services/import-session.service.spec.ts
describe('processPreview with fuzzy conflict detection', () => {
  it('should load candidate transactions by date/amount window for fuzzy matching', async () => {
    // Arrange: Create existing transaction with date=2024-01-15, amount=100.00
    const existingTx = await transactionRepository.save(
      transactionRepository.create({
        workspaceId: workspace.id,
        transactionDate: new Date('2024-01-15'),
        amount: 100.0,
        counterpartyName: 'ACME Corp',
        paymentPurpose: 'Invoice payment',
        currency: 'KZT',
        transactionType: 'expense',
        fingerprint: 'existing-fingerprint',
      }),
    );

    // New transaction with date=2024-01-16 (1 day diff), amount=100.50 (0.5% diff)
    const newTransactions: ParsedTransaction[] = [
      {
        transactionDate: new Date('2024-01-16'),
        debit: 100.5,
        credit: undefined,
        counterpartyName: 'ACME Corporation', // Similar but not exact
        paymentPurpose: 'Invoice payment',
        currency: 'KZT',
      },
    ];

    const session = await service.createSession(
      workspace.id,
      user.id,
      null,
      ImportSessionMode.PREVIEW,
      'file-hash-123',
      'test.csv',
      1000,
    );

    // Act
    const result = await service.processImport(session.id, newTransactions, ImportSessionMode.PREVIEW);

    // Assert: Should detect conflict via fuzzy matching
    expect(result.summary.conflictedCount).toBe(1);
    expect(result.summary.conflicts[0].reason).toContain('fuzzy');
    expect(result.summary.newCount).toBe(0);
  });

  it('should not create false positive conflicts for clearly different transactions', async () => {
    // Arrange: Existing transaction with date=2024-01-15, amount=100.00
    await transactionRepository.save(
      transactionRepository.create({
        workspaceId: workspace.id,
        transactionDate: new Date('2024-01-15'),
        amount: 100.0,
        counterpartyName: 'ACME Corp',
        paymentPurpose: 'Invoice payment',
        currency: 'KZT',
        transactionType: 'expense',
        fingerprint: 'existing-fingerprint',
      }),
    );

    // New transaction with different date (10 days), different amount (50% diff)
    const newTransactions: ParsedTransaction[] = [
      {
        transactionDate: new Date('2024-01-25'),
        debit: 150.0,
        credit: undefined,
        counterpartyName: 'Different Company',
        paymentPurpose: 'Different purpose',
        currency: 'KZT',
      },
    ];

    const session = await service.createSession(
      workspace.id,
      user.id,
      null,
      ImportSessionMode.PREVIEW,
      'file-hash-456',
      'test2.csv',
      1000,
    );

    // Act
    const result = await service.processImport(session.id, newTransactions, ImportSessionMode.PREVIEW);

    // Assert: Should classify as new, not conflict
    expect(result.summary.newCount).toBe(1);
    expect(result.summary.conflictedCount).toBe(0);
  });
});
```

### Step 2: Run test to verify it fails

Run: `cd backend && npm run test:unit -- @tests/unit/modules/import/services/import-session.service.spec.ts -t "processPreview with fuzzy conflict detection"`

Expected: FAIL - Tests will fail because `processPreview` currently only loads transactions by exact fingerprint, not by date/amount window.

### Step 3: Implement fuzzy conflict detection in processPreview

Update `backend/src/modules/import/services/import-session.service.ts`:

```typescript
// Around line 317, update processPreview method
private async processPreview(
  session: ImportSession,
  transactions: ParsedTransaction[],
): Promise<ImportSessionResult> {
  this.logger.debug(`Processing preview for session ${session.id}`);

  // Get statement account number if available
  const accountNumber = session.statement?.accountNumber || '';

  // Step 1: Generate fingerprints for all new transactions
  const classifications: TransactionClassification[] = [];
  const fingerprints: string[] = [];
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  let minAmount = Number.POSITIVE_INFINITY;
  let maxAmount = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];

    try {
      const fingerprint = this.fingerprintService.generateFingerprint(
        {
          ...tx,
          workspaceId: session.workspaceId,
          amount: tx.debit || tx.credit || null,
        },
        accountNumber,
      );
      fingerprints.push(fingerprint);

      classifications.push({
        transaction: tx,
        index: i,
        status: 'new', // Will be updated in next steps
        fingerprint,
      });

      // Track date range for fuzzy matching window
      if (tx.transactionDate) {
        if (!minDate || tx.transactionDate < minDate) {
          minDate = tx.transactionDate;
        }
        if (!maxDate || tx.transactionDate > maxDate) {
          maxDate = tx.transactionDate;
        }
      }

      // Track amount range for fuzzy matching window
      const amount = tx.debit || tx.credit || 0;
      if (amount < minAmount) {
        minAmount = amount;
      }
      if (amount > maxAmount) {
        maxAmount = amount;
      }
    } catch (error) {
      this.logger.warn(`Failed to generate fingerprint for transaction ${i}: ${error.message}`);
      classifications.push({
        transaction: tx,
        index: i,
        status: 'failed',
        error: `Fingerprint generation failed: ${error.message}`,
      });
    }
  }

  // Step 2: Find existing transactions by fingerprint (exact matches)
  const existingTransactions = await this.fingerprintService.findByFingerprints(
    session.workspaceId,
    fingerprints.filter(f => !!f),
  );

  const existingByFingerprint = new Map<string, Transaction>();
  for (const existing of existingTransactions) {
    if (existing.fingerprint) {
      existingByFingerprint.set(existing.fingerprint, existing);
    }
  }

  // Step 3: Load candidate existing transactions for fuzzy matching
  // Expand date range by tolerance window (e.g., +/- 3 days)
  const dateTolerance = this.importConfigService.getDateToleranceDays();
  const amountTolerancePercent = this.importConfigService.getAmountTolerancePercent();

  let candidateTransactions: Transaction[] = [];

  if (minDate && maxDate && minAmount !== Number.POSITIVE_INFINITY) {
    const expandedMinDate = new Date(minDate);
    expandedMinDate.setDate(expandedMinDate.getDate() - dateTolerance);

    const expandedMaxDate = new Date(maxDate);
    expandedMaxDate.setDate(expandedMaxDate.getDate() + dateTolerance);

    // Expand amount range by tolerance percent
    const amountMin = minAmount * (1 - amountTolerancePercent);
    const amountMax = maxAmount * (1 + amountTolerancePercent);

    this.logger.debug(
      `Loading candidate transactions: date range ${expandedMinDate.toISOString()} to ${expandedMaxDate.toISOString()}, amount range ${amountMin} to ${amountMax}`,
    );

    // Load transactions in the expanded window
    candidateTransactions = await this.transactionRepository
      .createQueryBuilder('tx')
      .where('tx.workspaceId = :workspaceId', { workspaceId: session.workspaceId })
      .andWhere('tx.transactionDate >= :minDate', { minDate: expandedMinDate })
      .andWhere('tx.transactionDate <= :maxDate', { maxDate: expandedMaxDate })
      .andWhere('tx.amount >= :minAmount', { minAmount: amountMin })
      .andWhere('tx.amount <= :maxAmount', { maxAmount: amountMax })
      .andWhere('tx.isDuplicate = :isDuplicate', { isDuplicate: false }) // Only consider non-duplicate transactions
      .getMany();

    this.logger.debug(`Loaded ${candidateTransactions.length} candidate transactions for fuzzy matching`);
  } else {
    this.logger.warn('Could not determine date/amount range for fuzzy matching, skipping candidate load');
  }

  // Step 4: Classify transactions as exact matches
  for (const classification of classifications) {
    if (classification.status === 'failed') continue;
    if (!classification.fingerprint) continue;

    const existing = existingByFingerprint.get(classification.fingerprint);
    if (existing) {
      classification.status = 'matched';
      classification.existingTransaction = existing;
    }
  }

  // Step 5: Detect conflicts using tolerant matching for non-matched transactions
  const unmatchedClassifications = classifications.filter(c => c.status === 'new');
  const unmatchedTransactions = unmatchedClassifications.map(c => c.transaction);

  const conflicts = await this.deduplicationService.detectConflicts(
    unmatchedTransactions,
    candidateTransactions, // Use broader candidate set instead of only exact fingerprint matches
  );

  // Map conflicts to classifications
  const conflictsByIndex = new Map<number, ConflictGroup>();
  for (const conflict of conflicts) {
    const index = unmatchedTransactions.indexOf(conflict.newTransaction);
    if (index >= 0) {
      const originalIndex = unmatchedClassifications[index].index;
      conflictsByIndex.set(originalIndex, conflict);
    }
  }

  for (const classification of classifications) {
    if (classification.status !== 'new') continue;

    const conflict = conflictsByIndex.get(classification.index);
    if (conflict) {
      classification.status = 'conflicted';
      classification.conflict = conflict;
      classification.existingTransaction = conflict.existingTransaction;
    }
  }

  // Step 6: Build summary
  const summary = this.buildSummary(classifications);

  // Step 7: Store preview results in session metadata
  const metadata: ImportSessionMetadata = {
    ...summary,
    // Store classifications for commit phase
    previewData: {
      classifications: classifications.map(c => ({
        index: c.index,
        status: c.status,
        fingerprint: c.fingerprint,
        existingTransactionId: c.existingTransaction?.id,
        conflictConfidence: c.conflict?.confidence,
        conflictMatchType: c.conflict?.matchType,
        conflictRecommendedAction: c.conflict?.recommendedAction,
        error: c.error,
      })),
    },
  } as any;

  await this.importSessionRepository.update(
    { id: session.id },
    {
      status: ImportSessionStatus.PREVIEW,
      sessionMetadata: metadata,
    },
  );

  return {
    sessionId: session.id,
    status: ImportSessionStatus.PREVIEW,
    summary,
  };
}
```

### Step 4: Add ImportConfigService methods if missing

Check if `ImportConfigService` has the tolerance getters. If not, add them:

```typescript
// In backend/src/modules/import/config/import.config.ts
export class ImportConfigService {
  // ... existing methods

  getDateToleranceDays(): number {
    return 3; // Default: 3 days tolerance
  }

  getAmountTolerancePercent(): number {
    return 0.05; // Default: 5% tolerance
  }
}
```

### Step 5: Run tests to verify they pass

Run: `cd backend && npm run test:unit -- @tests/unit/modules/import/services/import-session.service.spec.ts -t "processPreview with fuzzy conflict detection"`

Expected: PASS - All tests should pass now.

### Step 6: Commit

```bash
git add backend/src/modules/import/services/import-session.service.ts backend/src/modules/import/config/import.config.ts backend/@tests/unit/modules/import/services/import-session.service.spec.ts
git commit -m "feat(import): add fuzzy conflict detection with date/amount window matching

- Load candidate transactions by expanded date/amount range
- Pass broader candidate set to deduplication service
- Prevent false negatives from exact-fingerprint-only matching
- Add tolerance configuration methods
- Add comprehensive test coverage for fuzzy matching scenarios"
```

---

## Task 2: Refactor StatementProcessingService to Use Import Session Flow

**Files:**
- Modify: `backend/src/modules/parsing/services/statement-processing.service.ts:540-636`
- Modify: `backend/src/modules/parsing/parsing.module.ts`
- Test: `backend/@tests/unit/modules/parsing/services/statement-processing.service.spec.ts`

### Step 1: Write failing test for import session integration

```typescript
// In backend/@tests/unit/modules/parsing/services/statement-processing.service.spec.ts
describe('processStatement with import session flow', () => {
  it('should create import session and run preview before committing transactions', async () => {
    const mockSession = {
      id: 'session-123',
      status: ImportSessionStatus.PREVIEW,
    };

    const mockPreviewResult = {
      sessionId: 'session-123',
      status: ImportSessionStatus.PREVIEW,
      summary: {
        totalTransactions: 5,
        newCount: 5,
        matchedCount: 0,
        conflictedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        conflicts: [],
        warnings: [],
        errors: [],
      },
    };

    const mockCommitResult = {
      sessionId: 'session-123',
      status: ImportSessionStatus.COMPLETED,
      summary: {
        totalTransactions: 5,
        newCount: 5,
        matchedCount: 0,
        conflictedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        conflicts: [],
        warnings: [],
        errors: [],
      },
    };

    jest.spyOn(importSessionService, 'createSession').mockResolvedValue(mockSession as any);
    jest.spyOn(importSessionService, 'processImport')
      .mockResolvedValueOnce(mockPreviewResult)
      .mockResolvedValueOnce(mockCommitResult);

    const statement = await statementRepository.save(
      statementRepository.create({
        userId: user.id,
        workspaceId: workspace.id,
        fileName: 'test.pdf',
        fileType: 'pdf',
        fileSize: 1000,
        fileHash: 'abc123',
        status: StatementStatus.PENDING,
      }),
    );

    // Act
    await service.processStatement(statement.id);

    // Assert
    expect(importSessionService.createSession).toHaveBeenCalledWith(
      workspace.id,
      user.id,
      statement.id,
      ImportSessionMode.PREVIEW,
      'abc123',
      'test.pdf',
      1000,
    );

    expect(importSessionService.processImport).toHaveBeenCalledTimes(2);
    expect(importSessionService.processImport).toHaveBeenNthCalledWith(
      1,
      'session-123',
      expect.any(Array), // parsed transactions
      ImportSessionMode.PREVIEW,
    );
    expect(importSessionService.processImport).toHaveBeenNthCalledWith(
      2,
      'session-123',
      expect.any(Array), // parsed transactions
      ImportSessionMode.COMMIT,
    );
  });

  it('should store preview metadata in statement parsingDetails', async () => {
    // Test that preview results are stored for later review
    const mockSession = {
      id: 'session-456',
      status: ImportSessionStatus.PREVIEW,
    };

    const mockPreviewResult = {
      sessionId: 'session-456',
      status: ImportSessionStatus.PREVIEW,
      summary: {
        totalTransactions: 10,
        newCount: 8,
        matchedCount: 0,
        conflictedCount: 2,
        skippedCount: 0,
        failedCount: 0,
        conflicts: [
          { transactionIndex: 3, reason: 'fuzzy match', confidence: 0.92 },
          { transactionIndex: 7, reason: 'fuzzy match', confidence: 0.88 },
        ],
        warnings: [],
        errors: [],
      },
    };

    jest.spyOn(importSessionService, 'createSession').mockResolvedValue(mockSession as any);
    jest.spyOn(importSessionService, 'processImport').mockResolvedValue(mockPreviewResult);

    const statement = await statementRepository.save(
      statementRepository.create({
        userId: user.id,
        workspaceId: workspace.id,
        fileName: 'conflicts.pdf',
        fileType: 'pdf',
        fileSize: 2000,
        fileHash: 'def456',
        status: StatementStatus.PENDING,
      }),
    );

    // Act
    await service.processStatement(statement.id);

    // Assert
    const updated = await statementRepository.findOne({ where: { id: statement.id } });
    expect(updated.parsingDetails.importSession).toEqual({
      sessionId: 'session-456',
      status: ImportSessionStatus.PREVIEW,
      summary: mockPreviewResult.summary,
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `cd backend && npm run test:unit -- @tests/unit/modules/parsing/services/statement-processing.service.spec.ts -t "processStatement with import session flow"`

Expected: FAIL - Tests will fail because `StatementProcessingService` doesn't use `ImportSessionService` yet.

### Step 3: Import ImportSessionService in parsing module

Update `backend/src/modules/parsing/parsing.module.ts`:

```typescript
import { ImportModule } from '../import/import.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Statement, Transaction]),
    // ... other imports
    ImportModule, // Add this
  ],
  // ...
})
export class ParsingModule {}
```

### Step 4: Inject ImportSessionService and refactor createTransactions flow

Update `backend/src/modules/parsing/services/statement-processing.service.ts`:

```typescript
import { ImportSessionService, ImportSessionMode } from '../../import/services/import-session.service';
import { ImportSessionStatus } from '../../../entities/import-session.entity';

@Injectable()
export class StatementProcessingService {
  // ... existing fields

  constructor(
    // ... existing injections
    @Optional()
    private importSessionService?: ImportSessionService,
  ) {}

  // ... existing methods

  private async processStatementInternal(statementId: string): Promise<Statement> {
    // ... existing code up to line 540 (after parsing and metadata extraction)

    // Around line 540, replace the createTransactions call with import session flow

    // Determine majority category first (needed for classification)
    const majorityCategory = await this.classificationService.determineMajorityCategory(
      parsedStatement.transactions,
      statement.userId,
    );

    addLog('info', 'Creating import session for idempotent import workflow...');
    const createStartTime = Date.now();

    let importSessionId: string | undefined;
    let transactions: Transaction[] = [];
    let duplicatesSkipped = 0;

    // Use import session flow if service is available
    if (this.importSessionService) {
      try {
        // Step 1: Create import session
        const session = await this.importSessionService.createSession(
          statement.workspaceId,
          statement.userId,
          statement.id,
          ImportSessionMode.PREVIEW,
          statement.fileHash,
          statement.fileName,
          statement.fileSize,
        );
        importSessionId = session.id;

        addLog('info', `Created import session: ${session.id}`);

        // Step 2: Run preview
        const previewResult = await this.importSessionService.processImport(
          session.id,
          parsedStatement.transactions,
          ImportSessionMode.PREVIEW,
        );

        addLog(
          'info',
          `Preview completed: ${previewResult.summary.newCount} new, ${previewResult.summary.matchedCount} matched, ${previewResult.summary.conflictedCount} conflicts`,
        );

        // Store preview metadata in parsingDetails for later review
        parsingDetails.importSession = {
          sessionId: session.id,
          status: previewResult.status,
          summary: previewResult.summary,
        };

        // Step 3: Auto-commit if no conflicts, otherwise mark for manual review
        if (previewResult.summary.conflictedCount === 0) {
          addLog('info', 'No conflicts detected, auto-committing transactions...');

          const commitResult = await this.importSessionService.processImport(
            session.id,
            parsedStatement.transactions,
            ImportSessionMode.COMMIT,
          );

          addLog(
            'info',
            `Committed ${commitResult.summary.newCount} new transactions, skipped ${commitResult.summary.matchedCount} duplicates`,
          );

          duplicatesSkipped = commitResult.summary.matchedCount + commitResult.summary.skippedCount;

          // Load created transactions from database
          transactions = await this.transactionRepository.find({
            where: { importSessionId: session.id },
          });

          // Update parsingDetails with final status
          parsingDetails.importSession.status = ImportSessionStatus.COMPLETED;
          parsingDetails.importSession.summary = commitResult.summary;
        } else {
          addLog(
            'warn',
            `Found ${previewResult.summary.conflictedCount} conflicts, manual review required before commit`,
          );

          // Statement stays in PARSED status, user must review conflicts via API/UI
          statement.status = StatementStatus.PARSED;
          parsingDetails.warnings = parsingDetails.warnings || [];
          parsingDetails.warnings.push(
            `${previewResult.summary.conflictedCount} potential duplicate transactions require manual review`,
          );
        }
      } catch (importError) {
        addLog('error', `Import session failed: ${importError.message}`);

        // Fall back to legacy direct creation
        addLog('warn', 'Falling back to legacy transaction creation');
        const legacyResult = await this.createTransactionsLegacy(
          statement,
          parsedStatement.transactions,
          statement.userId,
          majorityCategory.categoryId,
          addLog,
        );
        transactions = legacyResult.transactions;
        duplicatesSkipped = legacyResult.duplicatesSkipped;
      }
    } else {
      // ImportSessionService not available, use legacy path
      addLog('info', 'ImportSessionService not available, using legacy transaction creation');
      const legacyResult = await this.createTransactionsLegacy(
        statement,
        parsedStatement.transactions,
        statement.userId,
        majorityCategory.categoryId,
        addLog,
      );
      transactions = legacyResult.transactions;
      duplicatesSkipped = legacyResult.duplicatesSkipped;
    }

    const createTime = Date.now() - createStartTime;

    addLog('info', `Created ${transactions.length} transactions in ${createTime}ms`);
    parsingDetails.transactionsCreated = transactions.length;
    parsingDetails.transactionsDeduplicated = duplicatesSkipped;
    this.observeDuration(
      'persist',
      createStartTime,
      statement.bankName,
      statement.fileType,
      'ok',
    );

    // ... rest of existing code (cross-statement dedup, validation, etc.)
  }

  // Rename existing createTransactions to createTransactionsLegacy
  private async createTransactionsLegacy(
    statement: Statement,
    parsedTransactions: ParsedTransaction[],
    userId: string,
    defaultCategoryId: string | undefined,
    addLog?: (level: string, message: string) => void,
  ): Promise<{ transactions: Transaction[]; duplicatesSkipped: number }> {
    // ... existing createTransactions implementation (lines 687-848)
  }
}
```

### Step 5: Run tests to verify they pass

Run: `cd backend && npm run test:unit -- @tests/unit/modules/parsing/services/statement-processing.service.spec.ts -t "processStatement with import session flow"`

Expected: PASS - Tests should pass with the new import session integration.

### Step 6: Commit

```bash
git add backend/src/modules/parsing/services/statement-processing.service.ts backend/src/modules/parsing/parsing.module.ts backend/@tests/unit/modules/parsing/services/statement-processing.service.spec.ts
git commit -m "feat(parsing): integrate import session flow into statement processing

- Create import session before parsing transactions
- Run preview to detect conflicts with fingerprints and fuzzy matching
- Auto-commit if no conflicts, otherwise require manual review
- Store import session metadata in parsingDetails for API access
- Preserve legacy path as fallback if ImportSessionService unavailable
- Add comprehensive test coverage for import session integration"
```

---

## Task 3: Add Import Session API Endpoints

**Files:**
- Create: `backend/src/modules/import/controllers/import-session.controller.ts`
- Create: `backend/src/modules/import/dto/import-preview-response.dto.ts`
- Create: `backend/src/modules/import/dto/resolve-conflicts.dto.ts`
- Modify: `backend/src/modules/import/import.module.ts`
- Test: `backend/@tests/unit/modules/import/controllers/import-session.controller.spec.ts`

### Step 1: Write failing test for import session controller

```typescript
// Create backend/@tests/unit/modules/import/controllers/import-session.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ImportSessionController } from '../../../src/modules/import/controllers/import-session.controller';
import { ImportSessionService } from '../../../src/modules/import/services/import-session.service';
import { StatementsService } from '../../../src/modules/statements/statements.service';
import { ImportSessionStatus, ImportSessionMode } from '../../../src/entities/import-session.entity';

describe('ImportSessionController', () => {
  let controller: ImportSessionController;
  let importSessionService: jest.Mocked<ImportSessionService>;
  let statementsService: jest.Mocked<StatementsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportSessionController],
      providers: [
        {
          provide: ImportSessionService,
          useValue: {
            getSessionSummary: jest.fn(),
            resolveConflicts: jest.fn(),
            processImport: jest.fn(),
          },
        },
        {
          provide: StatementsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ImportSessionController>(ImportSessionController);
    importSessionService = module.get(ImportSessionService);
    statementsService = module.get(StatementsService);
  });

  describe('GET /statements/:id/import-preview', () => {
    it('should return import preview summary from statement parsingDetails', async () => {
      const mockStatement = {
        id: 'stmt-123',
        parsingDetails: {
          importSession: {
            sessionId: 'session-456',
            status: ImportSessionStatus.PREVIEW,
            summary: {
              totalTransactions: 10,
              newCount: 8,
              matchedCount: 0,
              conflictedCount: 2,
              skippedCount: 0,
              failedCount: 0,
              conflicts: [
                { transactionIndex: 3, reason: 'fuzzy match', confidence: 0.92 },
                { transactionIndex: 7, reason: 'fuzzy match', confidence: 0.88 },
              ],
              warnings: [],
              errors: [],
            },
          },
        },
      };

      statementsService.findOne.mockResolvedValue(mockStatement as any);

      const result = await controller.getImportPreview('stmt-123', 'workspace-1', { id: 'user-1' } as any);

      expect(result).toEqual({
        sessionId: 'session-456',
        status: ImportSessionStatus.PREVIEW,
        summary: mockStatement.parsingDetails.importSession.summary,
      });
    });

    it('should throw NotFoundException if statement has no import session', async () => {
      statementsService.findOne.mockResolvedValue({ id: 'stmt-123', parsingDetails: {} } as any);

      await expect(
        controller.getImportPreview('stmt-123', 'workspace-1', { id: 'user-1' } as any),
      ).rejects.toThrow('No import session found for statement');
    });
  });

  describe('POST /statements/:id/import-commit', () => {
    it('should commit import session with conflict resolutions', async () => {
      const mockStatement = {
        id: 'stmt-123',
        parsingDetails: {
          importSession: {
            sessionId: 'session-456',
            status: ImportSessionStatus.PREVIEW,
          },
        },
      };

      const resolutions = {
        3: 'skip' as const,
        7: 'force_import' as const,
      };

      const mockCommitResult = {
        sessionId: 'session-456',
        status: ImportSessionStatus.COMPLETED,
        summary: {
          totalTransactions: 10,
          newCount: 9,
          matchedCount: 0,
          conflictedCount: 0,
          skippedCount: 1,
          failedCount: 0,
          conflicts: [],
          warnings: [],
          errors: [],
        },
      };

      statementsService.findOne.mockResolvedValue(mockStatement as any);
      importSessionService.resolveConflicts.mockResolvedValue(undefined);
      importSessionService.processImport.mockResolvedValue(mockCommitResult);

      const result = await controller.commitImport(
        'stmt-123',
        'workspace-1',
        { id: 'user-1' } as any,
        { resolutions },
      );

      expect(importSessionService.resolveConflicts).toHaveBeenCalledWith('session-456', resolutions);
      expect(importSessionService.processImport).toHaveBeenCalledWith(
        'session-456',
        expect.any(Array), // Will need to load parsed transactions
        ImportSessionMode.COMMIT,
      );
      expect(result).toEqual(mockCommitResult);
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `cd backend && npm run test:unit -- @tests/unit/modules/import/controllers/import-session.controller.spec.ts`

Expected: FAIL - Controller doesn't exist yet.

### Step 3: Create DTOs

```typescript
// Create backend/src/modules/import/dto/import-preview-response.dto.ts
import { ImportSessionStatus } from '../../../entities/import-session.entity';
import { ImportSessionSummary } from '../services/import-session.service';

export class ImportPreviewResponseDto {
  sessionId: string;
  status: ImportSessionStatus;
  summary: ImportSessionSummary;
}
```

```typescript
// Create backend/src/modules/import/dto/resolve-conflicts.dto.ts
import { IsObject, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ResolveConflictsDto {
  @IsObject()
  @Type(() => Object)
  resolutions: Record<number, 'skip' | 'force_import' | 'mark_duplicate'>;
}
```

### Step 4: Create controller

```typescript
// Create backend/src/modules/import/controllers/import-session.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../../../common/guards/workspace-context.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { WorkspaceId } from '../../../common/decorators/workspace.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Permission } from '../../../common/enums/permissions.enum';
import { User } from '../../../entities/user.entity';
import { ImportSessionMode } from '../../../entities/import-session.entity';
import { StatementsService } from '../../statements/statements.service';
import { ImportSessionService } from '../services/import-session.service';
import { ImportPreviewResponseDto } from '../dto/import-preview-response.dto';
import { ResolveConflictsDto } from '../dto/resolve-conflicts.dto';

@Controller('statements')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
export class ImportSessionController {
  constructor(
    private readonly importSessionService: ImportSessionService,
    private readonly statementsService: StatementsService,
  ) {}

  /**
   * GET /statements/:id/import-preview
   * Get import preview summary for a statement
   */
  @Get(':id/import-preview')
  @RequirePermission(Permission.STATEMENT_VIEW)
  async getImportPreview(
    @Param('id') statementId: string,
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: User,
  ): Promise<ImportPreviewResponseDto> {
    const statement = await this.statementsService.findOne(statementId, user.id, workspaceId);

    if (!statement) {
      throw new NotFoundException(`Statement ${statementId} not found`);
    }

    const importSession = statement.parsingDetails?.importSession;

    if (!importSession) {
      throw new NotFoundException('No import session found for statement');
    }

    return {
      sessionId: importSession.sessionId,
      status: importSession.status,
      summary: importSession.summary,
    };
  }

  /**
   * POST /statements/:id/import-commit
   * Commit import session with conflict resolutions
   */
  @Post(':id/import-commit')
  @RequirePermission(Permission.STATEMENT_UPLOAD)
  async commitImport(
    @Param('id') statementId: string,
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: User,
    @Body() body: ResolveConflictsDto,
  ): Promise<ImportPreviewResponseDto> {
    const statement = await this.statementsService.findOne(statementId, user.id, workspaceId);

    if (!statement) {
      throw new NotFoundException(`Statement ${statementId} not found`);
    }

    const importSession = statement.parsingDetails?.importSession;

    if (!importSession) {
      throw new BadRequestException('No import session found for statement');
    }

    const sessionId = importSession.sessionId;

    // Resolve conflicts if provided
    if (body.resolutions && Object.keys(body.resolutions).length > 0) {
      await this.importSessionService.resolveConflicts(sessionId, body.resolutions);
    }

    // Need to re-parse the statement to get parsed transactions for commit
    // For now, fetch from the statement's parsingDetails or reload
    // This is a limitation - we'd need to store parsed transactions in session metadata
    // For MVP, we can require the client to pass them, or we re-parse

    // Simplified: Assume parsed transactions are stored in session metadata
    // In production, you'd either:
    // 1. Store parsed transactions in session metadata during preview
    // 2. Re-parse the file (less efficient)
    // 3. Pass parsed transactions from client (requires API change)

    throw new BadRequestException(
      'Commit implementation requires parsed transactions - to be implemented in next iteration',
    );
  }

  /**
   * POST /statements/:id/import-cancel
   * Cancel import session
   */
  @Post(':id/import-cancel')
  @RequirePermission(Permission.STATEMENT_UPLOAD)
  async cancelImport(
    @Param('id') statementId: string,
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    const statement = await this.statementsService.findOne(statementId, user.id, workspaceId);

    if (!statement) {
      throw new NotFoundException(`Statement ${statementId} not found`);
    }

    const importSession = statement.parsingDetails?.importSession;

    if (!importSession) {
      throw new BadRequestException('No import session found for statement');
    }

    await this.importSessionService.cancelSession(importSession.sessionId);

    return {
      message: 'Import session cancelled successfully',
    };
  }
}
```

### Step 5: Register controller in module

Update `backend/src/modules/import/import.module.ts`:

```typescript
import { ImportSessionController } from './controllers/import-session.controller';
import { StatementsModule } from '../statements/statements.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ImportSession, Transaction, Statement, Workspace, User]),
    forwardRef(() => StatementsModule), // For StatementsService
  ],
  controllers: [ImportSessionController],
  providers: [
    // ... existing providers
  ],
  exports: [
    // ... existing exports
  ],
})
export class ImportModule {}
```

### Step 6: Run tests to verify they pass

Run: `cd backend && npm run test:unit -- @tests/unit/modules/import/controllers/import-session.controller.spec.ts`

Expected: PASS (except for the commit test which we marked as TODO).

### Step 7: Commit

```bash
git add backend/src/modules/import/controllers/import-session.controller.ts backend/src/modules/import/dto/ backend/src/modules/import/import.module.ts backend/@tests/unit/modules/import/controllers/import-session.controller.spec.ts
git commit -m "feat(import): add REST endpoints for import preview and conflict resolution

- GET /statements/:id/import-preview - retrieve preview summary
- POST /statements/:id/import-commit - commit with conflict resolutions
- POST /statements/:id/import-cancel - cancel import session
- Add DTOs for request/response validation
- Note: commit endpoint requires parsed transaction storage (next iteration)"
```

---

## Task 4: Enhance Import Session to Store Parsed Transactions

**Files:**
- Modify: `backend/src/entities/import-session.entity.ts:28-42`
- Modify: `backend/src/modules/import/services/import-session.service.ts:422-446`
- Create: `backend/src/migrations/1738400000000-AddParsedTransactionsToImportSession.ts`

### Step 1: Write failing test for storing parsed transactions

```typescript
// In backend/@tests/unit/modules/import/services/import-session.service.spec.ts
describe('storing parsed transactions in session', () => {
  it('should store parsed transactions in preview metadata for later commit', async () => {
    const newTransactions: ParsedTransaction[] = [
      {
        transactionDate: new Date('2024-01-15'),
        debit: 100.0,
        credit: undefined,
        counterpartyName: 'Test Company',
        paymentPurpose: 'Test payment',
        currency: 'KZT',
      },
    ];

    const session = await service.createSession(
      workspace.id,
      user.id,
      null,
      ImportSessionMode.PREVIEW,
      'file-hash-789',
      'test.csv',
      1000,
    );

    await service.processImport(session.id, newTransactions, ImportSessionMode.PREVIEW);

    const updated = await importSessionRepository.findOne({ where: { id: session.id } });

    expect(updated.sessionMetadata.previewData.parsedTransactions).toBeDefined();
    expect(updated.sessionMetadata.previewData.parsedTransactions).toHaveLength(1);
    expect(updated.sessionMetadata.previewData.parsedTransactions[0]).toMatchObject({
      transactionDate: expect.any(String), // Serialized as ISO string
      debit: 100.0,
      counterpartyName: 'Test Company',
    });
  });

  it('should use stored parsed transactions during commit', async () => {
    const newTransactions: ParsedTransaction[] = [
      {
        transactionDate: new Date('2024-01-20'),
        debit: 200.0,
        credit: undefined,
        counterpartyName: 'Another Company',
        paymentPurpose: 'Another payment',
        currency: 'KZT',
      },
    ];

    const session = await service.createSession(
      workspace.id,
      user.id,
      null,
      ImportSessionMode.PREVIEW,
      'file-hash-999',
      'test2.csv',
      1000,
    );

    await service.processImport(session.id, newTransactions, ImportSessionMode.PREVIEW);

    // Commit without passing transactions (should use stored ones)
    const commitResult = await service.processImport(session.id, [], ImportSessionMode.COMMIT);

    expect(commitResult.summary.newCount).toBe(1);

    const created = await transactionRepository.find({ where: { importSessionId: session.id } });
    expect(created).toHaveLength(1);
    expect(created[0].counterpartyName).toBe('Another Company');
  });
});
```

### Step 2: Run test to verify it fails

Run: `cd backend && npm run test:unit -- @tests/unit/modules/import/services/import-session.service.spec.ts -t "storing parsed transactions in session"`

Expected: FAIL - Session metadata doesn't store parsed transactions yet.

### Step 3: Update entity interface

Update `backend/src/entities/import-session.entity.ts`:

```typescript
export interface ImportSessionMetadata {
  totalTransactions: number;
  newCount: number;
  matchedCount: number;
  skippedCount: number;
  conflictedCount: number;
  failedCount: number;
  conflicts: Array<{
    transactionIndex: number;
    reason: string;
    confidence: number;
  }>;
  warnings: string[];
  errors: string[];
  // Add this field:
  previewData?: {
    parsedTransactions?: any[]; // Serialized ParsedTransaction objects
    classifications?: any[];
  };
}
```

### Step 4: Store parsed transactions in processPreview

Update `backend/src/modules/import/services/import-session.service.ts`:

```typescript
// Around line 420, in processPreview method, update metadata creation:
const metadata: ImportSessionMetadata = {
  ...summary,
  // Store classifications AND parsed transactions for commit phase
  previewData: {
    // Serialize parsed transactions (convert Dates to ISO strings)
    parsedTransactions: transactions.map(tx => ({
      ...tx,
      transactionDate: tx.transactionDate?.toISOString(),
    })),
    classifications: classifications.map(c => ({
      index: c.index,
      status: c.status,
      fingerprint: c.fingerprint,
      existingTransactionId: c.existingTransaction?.id,
      conflictConfidence: c.conflict?.confidence,
      conflictMatchType: c.conflict?.matchType,
      conflictRecommendedAction: c.conflict?.recommendedAction,
      error: c.error,
    })),
  },
} as any;
```

### Step 5: Use stored transactions in processCommit

Update `backend/src/modules/import/services/import-session.service.ts`:

```typescript
// Around line 456, in processCommit method:
private async processCommit(
  session: ImportSession,
  transactions: ParsedTransaction[], // Can be empty if using stored
): Promise<ImportSessionResult> {
  this.logger.debug(`Processing commit for session ${session.id}`);

  // Validate that preview data exists
  const metadata = session.sessionMetadata as any;
  if (!metadata?.previewData?.classifications) {
    throw new ImportValidationError(
      'Cannot commit without preview data. Run preview mode first.',
      { sessionId: session.id },
    );
  }

  // Use stored parsed transactions if not provided
  let parsedTransactions = transactions;
  if (!parsedTransactions || parsedTransactions.length === 0) {
    if (!metadata.previewData.parsedTransactions) {
      throw new ImportValidationError(
        'No parsed transactions available for commit. Must provide transactions or run preview first.',
        { sessionId: session.id },
      );
    }

    // Deserialize stored transactions (convert ISO strings back to Dates)
    parsedTransactions = metadata.previewData.parsedTransactions.map((tx: any) => ({
      ...tx,
      transactionDate: tx.transactionDate ? new Date(tx.transactionDate) : undefined,
    }));

    this.logger.debug(`Using ${parsedTransactions.length} stored parsed transactions for commit`);
  }

  // Rest of processCommit implementation using parsedTransactions...
  // ... (existing code continues)
}
```

### Step 6: Create migration (optional, metadata is JSONB so no schema change needed)

No migration needed since `sessionMetadata` is already JSONB and can store any structure.

### Step 7: Run tests to verify they pass

Run: `cd backend && npm run test:unit -- @tests/unit/modules/import/services/import-session.service.spec.ts -t "storing parsed transactions in session"`

Expected: PASS - Tests should pass with stored transactions.

### Step 8: Commit

```bash
git add backend/src/entities/import-session.entity.ts backend/src/modules/import/services/import-session.service.ts backend/@tests/unit/modules/import/services/import-session.service.spec.ts
git commit -m "feat(import): store parsed transactions in session metadata for commit

- Serialize parsed transactions during preview (Dates to ISO strings)
- Allow commit without passing transactions (use stored ones)
- Deserialize stored transactions during commit (ISO strings to Dates)
- Enable stateless commit API - no need to re-parse or pass data
- Add test coverage for transaction storage and retrieval"
```

---

## Task 5: Complete Import Commit Endpoint Implementation

**Files:**
- Modify: `backend/src/modules/import/controllers/import-session.controller.ts:50-90`
- Test: `backend/@tests/unit/modules/import/controllers/import-session.controller.spec.ts`

### Step 1: Update failing test to expect commit to work

Update the test from Task 3:

```typescript
// In backend/@tests/unit/modules/import/controllers/import-session.controller.spec.ts
describe('POST /statements/:id/import-commit', () => {
  it('should commit import session with conflict resolutions using stored transactions', async () => {
    const mockStatement = {
      id: 'stmt-123',
      parsingDetails: {
        importSession: {
          sessionId: 'session-456',
          status: ImportSessionStatus.PREVIEW,
        },
      },
    };

    const resolutions = {
      3: 'skip' as const,
      7: 'force_import' as const,
    };

    const mockCommitResult = {
      sessionId: 'session-456',
      status: ImportSessionStatus.COMPLETED,
      summary: {
        totalTransactions: 10,
        newCount: 9,
        matchedCount: 0,
        conflictedCount: 0,
        skippedCount: 1,
        failedCount: 0,
        conflicts: [],
        warnings: [],
        errors: [],
      },
    };

    statementsService.findOne.mockResolvedValue(mockStatement as any);
    importSessionService.resolveConflicts.mockResolvedValue(undefined);
    importSessionService.processImport.mockResolvedValue(mockCommitResult);

    const result = await controller.commitImport(
      'stmt-123',
      'workspace-1',
      { id: 'user-1' } as any,
      { resolutions },
    );

    expect(importSessionService.resolveConflicts).toHaveBeenCalledWith('session-456', resolutions);
    // Should call with empty array since transactions are stored
    expect(importSessionService.processImport).toHaveBeenCalledWith(
      'session-456',
      [],
      ImportSessionMode.COMMIT,
    );
    expect(result).toEqual(mockCommitResult);
  });
});
```

### Step 2: Run test to verify it fails

Run: `cd backend && npm run test:unit -- @tests/unit/modules/import/controllers/import-session.controller.spec.ts -t "should commit import session"`

Expected: FAIL - Controller throws BadRequestException.

### Step 3: Implement commit endpoint

Update `backend/src/modules/import/controllers/import-session.controller.ts`:

```typescript
/**
 * POST /statements/:id/import-commit
 * Commit import session with conflict resolutions
 */
@Post(':id/import-commit')
@RequirePermission(Permission.STATEMENT_UPLOAD)
async commitImport(
  @Param('id') statementId: string,
  @WorkspaceId() workspaceId: string,
  @CurrentUser() user: User,
  @Body() body: ResolveConflictsDto,
): Promise<ImportPreviewResponseDto> {
  const statement = await this.statementsService.findOne(statementId, user.id, workspaceId);

  if (!statement) {
    throw new NotFoundException(`Statement ${statementId} not found`);
  }

  const importSession = statement.parsingDetails?.importSession;

  if (!importSession) {
    throw new BadRequestException('No import session found for statement');
  }

  const sessionId = importSession.sessionId;

  // Resolve conflicts if provided
  if (body.resolutions && Object.keys(body.resolutions).length > 0) {
    await this.importSessionService.resolveConflicts(sessionId, body.resolutions);
  }

  // Commit using stored parsed transactions (pass empty array)
  const result = await this.importSessionService.processImport(
    sessionId,
    [], // Use stored transactions from preview
    ImportSessionMode.COMMIT,
  );

  // Update statement status to COMPLETED
  await this.statementsService.updateStatus(statementId, 'validated');

  return {
    sessionId: result.sessionId,
    status: result.status,
    summary: result.summary,
  };
}
```

### Step 4: Add updateStatus method to StatementsService if missing

Check if `StatementsService` has `updateStatus`. If not, add it:

```typescript
// In backend/src/modules/statements/statements.service.ts
async updateStatus(id: string, status: string): Promise<void> {
  await this.statementRepository.update({ id }, { status });
}
```

### Step 5: Run tests to verify they pass

Run: `cd backend && npm run test:unit -- @tests/unit/modules/import/controllers/import-session.controller.spec.ts`

Expected: PASS - All controller tests should pass.

### Step 6: Commit

```bash
git add backend/src/modules/import/controllers/import-session.controller.ts backend/src/modules/statements/statements.service.ts backend/@tests/unit/modules/import/controllers/import-session.controller.spec.ts
git commit -m "feat(import): implement commit endpoint using stored transactions

- Commit uses stored parsed transactions from preview
- Apply conflict resolutions before commit
- Update statement status to validated after successful commit
- No need to re-parse or pass transaction data
- Add updateStatus method to StatementsService"
```

---

## Task 6: Create Frontend Import Preview and Conflict Resolution UI

**Files:**
- Create: `frontend/app/statements/[id]/import-preview/page.tsx`
- Create: `frontend/app/statements/[id]/import-preview/page.content.ts`
- Create: `frontend/app/components/import/ConflictReviewTable.tsx`
- Create: `frontend/app/components/import/ConflictReviewTable.stories.tsx`
- Modify: `frontend/app/lib/api.ts`

### Step 1: Add API client functions

Update `frontend/app/lib/api.ts`:

```typescript
// Import Preview & Commit APIs

export interface ImportPreviewResponse {
  sessionId: string;
  status: string;
  summary: {
    totalTransactions: number;
    newCount: number;
    matchedCount: number;
    conflictedCount: number;
    skippedCount: number;
    failedCount: number;
    conflicts: Array<{
      transactionIndex: number;
      reason: string;
      confidence: number;
    }>;
    warnings: string[];
    errors: string[];
  };
}

export const importApi = {
  getPreview: async (statementId: string): Promise<ImportPreviewResponse> => {
    const response = await api.get(`/statements/${statementId}/import-preview`);
    return response.data;
  },

  commitImport: async (
    statementId: string,
    resolutions: Record<number, 'skip' | 'force_import' | 'mark_duplicate'>,
  ): Promise<ImportPreviewResponse> => {
    const response = await api.post(`/statements/${statementId}/import-commit`, { resolutions });
    return response.data;
  },

  cancelImport: async (statementId: string): Promise<{ message: string }> => {
    const response = await api.post(`/statements/${statementId}/import-cancel`);
    return response.data;
  },
};
```

### Step 2: Create ConflictReviewTable component

```typescript
// Create frontend/app/components/import/ConflictReviewTable.tsx
'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

interface Conflict {
  transactionIndex: number;
  reason: string;
  confidence: number;
}

interface ConflictReviewTableProps {
  conflicts: Conflict[];
  onResolve: (resolutions: Record<number, 'skip' | 'force_import' | 'mark_duplicate'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConflictReviewTable({
  conflicts,
  onResolve,
  onCancel,
  isLoading = false,
}: ConflictReviewTableProps) {
  const [resolutions, setResolutions] = useState<
    Record<number, 'skip' | 'force_import' | 'mark_duplicate'>
  >({});

  const handleResolutionChange = (
    index: number,
    action: 'skip' | 'force_import' | 'mark_duplicate',
  ) => {
    setResolutions(prev => ({
      ...prev,
      [index]: action,
    }));
  };

  const handleCommit = () => {
    onResolve(resolutions);
  };

  const allResolved = conflicts.every(c => resolutions[c.transactionIndex]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resolve Duplicate Conflicts</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertDescription>
            Found {conflicts.length} potential duplicate transaction{conflicts.length > 1 ? 's' : ''}.
            Please review and choose an action for each conflict.
          </AlertDescription>
        </Alert>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction #</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conflicts.map(conflict => (
              <TableRow key={conflict.transactionIndex}>
                <TableCell>{conflict.transactionIndex + 1}</TableCell>
                <TableCell>{conflict.reason}</TableCell>
                <TableCell>
                  <Badge variant={conflict.confidence > 0.9 ? 'destructive' : 'warning'}>
                    {(conflict.confidence * 100).toFixed(0)}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={resolutions[conflict.transactionIndex] === 'skip' ? 'default' : 'outline'}
                      onClick={() => handleResolutionChange(conflict.transactionIndex, 'skip')}
                      disabled={isLoading}
                    >
                      Skip
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        resolutions[conflict.transactionIndex] === 'force_import' ? 'default' : 'outline'
                      }
                      onClick={() => handleResolutionChange(conflict.transactionIndex, 'force_import')}
                      disabled={isLoading}
                    >
                      Import Anyway
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        resolutions[conflict.transactionIndex] === 'mark_duplicate'
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() =>
                        handleResolutionChange(conflict.transactionIndex, 'mark_duplicate')
                      }
                      disabled={isLoading}
                    >
                      Mark Duplicate
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCommit} disabled={!allResolved || isLoading}>
            {isLoading ? 'Committing...' : `Commit (${Object.keys(resolutions).length}/${conflicts.length})`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 3: Create import preview page

```typescript
// Create frontend/app/statements/[id]/import-preview/page.content.ts
import { t } from 'intlayer';

export default {
  title: t({ en: 'Import Preview', ru: 'Предпросмотр импорта', kk: 'Импортты алдын ала қарау' }),
  loading: t({ en: 'Loading preview...', ru: 'Загрузка...', kk: 'Жүктеу...' }),
  summary: {
    total: t({ en: 'Total Transactions', ru: 'Всего транзакций', kk: 'Барлығы транзакциялар' }),
    new: t({ en: 'New', ru: 'Новые', kk: 'Жаңа' }),
    matched: t({ en: 'Duplicates Skipped', ru: 'Дубликаты пропущены', kk: 'Қайталанғандар өткізілді' }),
    conflicts: t({ en: 'Conflicts', ru: 'Конфликты', kk: 'Қақтығыстар' }),
  },
  noConflicts: t({
    en: 'No conflicts detected. Import will proceed automatically.',
    ru: 'Конфликтов не обнаружено. Импорт будет выполнен автоматически.',
    kk: 'Қақтығыстар табылмады. Импорт автоматты түрде жүзеге асырылады.',
  }),
  backToStatement: t({ en: 'Back to Statement', ru: 'Назад к выписке', kk: 'Үзіндіге оралу' }),
};
```

```typescript
// Create frontend/app/statements/[id]/import-preview/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useIntlayer } from 'next-intlayer';
import { importApi, ImportPreviewResponse } from '@/app/lib/api';
import { ConflictReviewTable } from '@/app/components/import/ConflictReviewTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import content from './page.content';

export default function ImportPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { title, loading, summary, noConflicts, backToStatement } = useIntlayer(content);

  const statementId = params.id as string;

  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPreview();
  }, [statementId]);

  const loadPreview = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await importApi.getPreview(statementId);
      setPreview(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load import preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (
    resolutions: Record<number, 'skip' | 'force_import' | 'mark_duplicate'>,
  ) => {
    try {
      setIsCommitting(true);
      await importApi.commitImport(statementId, resolutions);
      // Redirect to statement view on success
      router.push(`/statements/${statementId}/view`);
    } catch (err: any) {
      setError(err.message || 'Failed to commit import');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await importApi.cancelImport(statementId);
      router.push(`/statements/${statementId}/view`);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel import');
    }
  };

  if (isLoading) {
    return <div className="p-8">{loading}</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-8">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!preview) {
    return null;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{title}</h1>
        <Button variant="outline" onClick={() => router.push(`/statements/${statementId}/view`)}>
          {backToStatement}
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Import Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{summary.total}</p>
              <p className="text-2xl font-bold">{preview.summary.totalTransactions}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{summary.new}</p>
              <p className="text-2xl font-bold text-green-600">{preview.summary.newCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{summary.matched}</p>
              <p className="text-2xl font-bold text-blue-600">{preview.summary.matchedCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{summary.conflicts}</p>
              <p className="text-2xl font-bold text-orange-600">{preview.summary.conflictedCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conflicts */}
      {preview.summary.conflictedCount > 0 ? (
        <ConflictReviewTable
          conflicts={preview.summary.conflicts}
          onResolve={handleResolve}
          onCancel={handleCancel}
          isLoading={isCommitting}
        />
      ) : (
        <Alert>
          <AlertDescription>{noConflicts}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

### Step 4: Create Storybook story for ConflictReviewTable

```typescript
// Create frontend/app/components/import/ConflictReviewTable.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ConflictReviewTable } from './ConflictReviewTable';

const meta: Meta<typeof ConflictReviewTable> = {
  title: 'Import/ConflictReviewTable',
  component: ConflictReviewTable,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof ConflictReviewTable>;

export const Default: Story = {
  args: {
    conflicts: [
      {
        transactionIndex: 3,
        reason: 'Fuzzy match on date/amount',
        confidence: 0.92,
      },
      {
        transactionIndex: 7,
        reason: 'Fuzzy match on counterparty',
        confidence: 0.88,
      },
      {
        transactionIndex: 12,
        reason: 'Fuzzy match on date/amount/text',
        confidence: 0.95,
      },
    ],
    onResolve: resolutions => console.log('Resolved:', resolutions),
    onCancel: () => console.log('Cancelled'),
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    isLoading: true,
  },
};
```

### Step 5: Test in Storybook

Run: `cd frontend && npm run storybook`

Navigate to `Import/ConflictReviewTable` and verify component renders correctly.

### Step 6: Commit

```bash
git add frontend/app/statements/[id]/import-preview/ frontend/app/components/import/ frontend/app/lib/api.ts
git commit -m "feat(frontend): add import preview and conflict resolution UI

- Create import preview page with summary cards
- Add ConflictReviewTable component for conflict resolution
- Support skip, force_import, and mark_duplicate actions
- Add API client functions for preview/commit/cancel
- Add Storybook story for ConflictReviewTable
- Add i18n content for 3 languages (en, ru, kk)"
```

---

## Task 7: Add Integration Tests for End-to-End Import Flow

**Files:**
- Create: `backend/@tests/integration/import-flow.integration.spec.ts`
- Create: `backend/@tests/integration/jest-integration.config.js`

### Step 1: Create integration test config

```javascript
// Create backend/@tests/integration/jest-integration.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../../',
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage-integration',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};
```

### Step 2: Create integration test file

```typescript
// Create backend/@tests/integration/import-flow.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ImportModule } from '../../src/modules/import/import.module';
import { ParsingModule } from '../../src/modules/parsing/parsing.module';
import { StatementsModule } from '../../src/modules/statements/statements.module';
import { TransactionsModule } from '../../src/modules/transactions/transactions.module';
import { WorkspacesModule } from '../../src/modules/workspaces/workspaces.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { ImportSessionService, ImportSessionMode } from '../../src/modules/import/services/import-session.service';
import { StatementProcessingService } from '../../src/modules/parsing/services/statement-processing.service';
import { Statement, StatementStatus } from '../../src/entities/statement.entity';
import { Transaction } from '../../src/entities/transaction.entity';
import { ImportSession, ImportSessionStatus } from '../../src/entities/import-session.entity';
import { User } from '../../src/entities/user.entity';
import { Workspace } from '../../src/entities/workspace.entity';
import { ParsedTransaction } from '../../src/modules/parsing/interfaces/parsed-statement.interface';

describe('Import Flow Integration Tests', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let importSessionService: ImportSessionService;
  let statementProcessingService: StatementProcessingService;
  let workspace: Workspace;
  let user: User;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DATABASE_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT || '5432', 10),
          username: process.env.DATABASE_USER || 'postgres',
          password: process.env.DATABASE_PASSWORD || 'postgres',
          database: process.env.DATABASE_NAME || 'lumio_test',
          entities: [__dirname + '/../../src/entities/**/*.entity{.ts,.js}'],
          synchronize: true, // Only for tests
        }),
        ImportModule,
        ParsingModule,
        StatementsModule,
        TransactionsModule,
        WorkspacesModule,
        UsersModule,
      ],
    }).compile();

    dataSource = module.get<DataSource>(DataSource);
    importSessionService = module.get<ImportSessionService>(ImportSessionService);
    statementProcessingService = module.get<StatementProcessingService>(StatementProcessingService);

    // Create test user and workspace
    const userRepo = dataSource.getRepository(User);
    const workspaceRepo = dataSource.getRepository(Workspace);

    workspace = await workspaceRepo.save(
      workspaceRepo.create({ name: 'Test Workspace', ownerId: 'test-owner' }),
    );

    user = await userRepo.save(
      userRepo.create({ email: 'test@example.com', passwordHash: 'hash', name: 'Test User' }),
    );
  });

  afterAll(async () => {
    await dataSource.dropDatabase();
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    // Clean up tables before each test
    await dataSource.getRepository(Transaction).clear();
    await dataSource.getRepository(ImportSession).clear();
    await dataSource.getRepository(Statement).clear();
  });

  describe('Initial Import (no duplicates)', () => {
    it('should import new transactions without conflicts', async () => {
      const transactions: ParsedTransaction[] = [
        {
          transactionDate: new Date('2024-01-15'),
          debit: 100.0,
          credit: undefined,
          counterpartyName: 'ACME Corp',
          paymentPurpose: 'Invoice payment',
          currency: 'KZT',
        },
        {
          transactionDate: new Date('2024-01-16'),
          debit: undefined,
          credit: 200.0,
          counterpartyName: 'Customer A',
          paymentPurpose: 'Revenue',
          currency: 'KZT',
        },
      ];

      const session = await importSessionService.createSession(
        workspace.id,
        user.id,
        null,
        ImportSessionMode.PREVIEW,
        'file-hash-1',
        'initial.csv',
        1000,
      );

      // Preview
      const previewResult = await importSessionService.processImport(
        session.id,
        transactions,
        ImportSessionMode.PREVIEW,
      );

      expect(previewResult.summary.totalTransactions).toBe(2);
      expect(previewResult.summary.newCount).toBe(2);
      expect(previewResult.summary.matchedCount).toBe(0);
      expect(previewResult.summary.conflictedCount).toBe(0);

      // Commit
      const commitResult = await importSessionService.processImport(
        session.id,
        [], // Use stored transactions
        ImportSessionMode.COMMIT,
      );

      expect(commitResult.summary.newCount).toBe(2);
      expect(commitResult.status).toBe(ImportSessionStatus.COMPLETED);

      // Verify transactions in database
      const saved = await dataSource.getRepository(Transaction).find({
        where: { importSessionId: session.id },
      });

      expect(saved).toHaveLength(2);
      expect(saved[0].fingerprint).toBeDefined();
      expect(saved[0].isDuplicate).toBe(false);
    });
  });

  describe('Re-upload identical file (exact duplicates)', () => {
    it('should detect exact duplicates and skip them', async () => {
      const transactions: ParsedTransaction[] = [
        {
          transactionDate: new Date('2024-01-15'),
          debit: 100.0,
          credit: undefined,
          counterpartyName: 'ACME Corp',
          paymentPurpose: 'Invoice payment',
          currency: 'KZT',
        },
      ];

      // First import
      const session1 = await importSessionService.createSession(
        workspace.id,
        user.id,
        null,
        ImportSessionMode.PREVIEW,
        'file-hash-2',
        'first.csv',
        1000,
      );

      await importSessionService.processImport(session1.id, transactions, ImportSessionMode.PREVIEW);
      await importSessionService.processImport(session1.id, [], ImportSessionMode.COMMIT);

      // Second import (identical)
      const session2 = await importSessionService.createSession(
        workspace.id,
        user.id,
        null,
        ImportSessionMode.PREVIEW,
        'file-hash-2-duplicate',
        'second.csv',
        1000,
      );

      const previewResult = await importSessionService.processImport(
        session2.id,
        transactions,
        ImportSessionMode.PREVIEW,
      );

      expect(previewResult.summary.newCount).toBe(0);
      expect(previewResult.summary.matchedCount).toBe(1);
      expect(previewResult.summary.conflictedCount).toBe(0);
    });
  });

  describe('Overlapping statement with date/amount drift (fuzzy duplicates)', () => {
    it('should detect fuzzy conflicts and allow resolution', async () => {
      // First import
      const initialTransactions: ParsedTransaction[] = [
        {
          transactionDate: new Date('2024-01-15'),
          debit: 100.0,
          credit: undefined,
          counterpartyName: 'ACME Corp',
          paymentPurpose: 'Invoice payment',
          currency: 'KZT',
        },
      ];

      const session1 = await importSessionService.createSession(
        workspace.id,
        user.id,
        null,
        ImportSessionMode.PREVIEW,
        'file-hash-3',
        'original.csv',
        1000,
      );

      await importSessionService.processImport(session1.id, initialTransactions, ImportSessionMode.PREVIEW);
      await importSessionService.processImport(session1.id, [], ImportSessionMode.COMMIT);

      // Second import with drift
      const driftedTransactions: ParsedTransaction[] = [
        {
          transactionDate: new Date('2024-01-16'), // 1 day difference
          debit: 100.5, // 0.5% amount difference
          credit: undefined,
          counterpartyName: 'ACME Corporation', // Similar name
          paymentPurpose: 'Invoice payment',
          currency: 'KZT',
        },
      ];

      const session2 = await importSessionService.createSession(
        workspace.id,
        user.id,
        null,
        ImportSessionMode.PREVIEW,
        'file-hash-4',
        'drifted.csv',
        1000,
      );

      const previewResult = await importSessionService.processImport(
        session2.id,
        driftedTransactions,
        ImportSessionMode.PREVIEW,
      );

      // Should detect conflict
      expect(previewResult.summary.conflictedCount).toBe(1);
      expect(previewResult.summary.conflicts[0].confidence).toBeGreaterThan(0.8);

      // Resolve as skip
      await importSessionService.resolveConflicts(session2.id, { 0: 'skip' });

      const commitResult = await importSessionService.processImport(session2.id, [], ImportSessionMode.COMMIT);

      expect(commitResult.summary.skippedCount).toBe(1);
      expect(commitResult.summary.newCount).toBe(0);

      // Verify only 1 transaction in database (from first import)
      const allTransactions = await dataSource.getRepository(Transaction).find({
        where: { workspaceId: workspace.id },
      });

      expect(allTransactions).toHaveLength(1);
    });

    it('should allow force import of fuzzy duplicates', async () => {
      // First import
      const initialTransactions: ParsedTransaction[] = [
        {
          transactionDate: new Date('2024-01-20'),
          debit: 200.0,
          credit: undefined,
          counterpartyName: 'XYZ Ltd',
          paymentPurpose: 'Service fee',
          currency: 'KZT',
        },
      ];

      const session1 = await importSessionService.createSession(
        workspace.id,
        user.id,
        null,
        ImportSessionMode.PREVIEW,
        'file-hash-5',
        'original2.csv',
        1000,
      );

      await importSessionService.processImport(session1.id, initialTransactions, ImportSessionMode.PREVIEW);
      await importSessionService.processImport(session1.id, [], ImportSessionMode.COMMIT);

      // Second import with slight drift
      const driftedTransactions: ParsedTransaction[] = [
        {
          transactionDate: new Date('2024-01-21'),
          debit: 201.0,
          credit: undefined,
          counterpartyName: 'XYZ Limited',
          paymentPurpose: 'Service fee',
          currency: 'KZT',
        },
      ];

      const session2 = await importSessionService.createSession(
        workspace.id,
        user.id,
        null,
        ImportSessionMode.PREVIEW,
        'file-hash-6',
        'drifted2.csv',
        1000,
      );

      const previewResult = await importSessionService.processImport(
        session2.id,
        driftedTransactions,
        ImportSessionMode.PREVIEW,
      );

      expect(previewResult.summary.conflictedCount).toBe(1);

      // Resolve as force_import
      await importSessionService.resolveConflicts(session2.id, { 0: 'force_import' });

      const commitResult = await importSessionService.processImport(session2.id, [], ImportSessionMode.COMMIT);

      expect(commitResult.summary.newCount).toBe(1);

      // Verify 2 transactions in database
      const allTransactions = await dataSource.getRepository(Transaction).find({
        where: { workspaceId: workspace.id },
      });

      expect(allTransactions).toHaveLength(2);
      expect(allTransactions[1].isDuplicate).toBe(false);
    });

    it('should mark fuzzy duplicates when resolution is mark_duplicate', async () => {
      // First import
      const initialTransactions: ParsedTransaction[] = [
        {
          transactionDate: new Date('2024-01-25'),
          debit: 300.0,
          credit: undefined,
          counterpartyName: 'Supplier ABC',
          paymentPurpose: 'Materials',
          currency: 'KZT',
        },
      ];

      const session1 = await importSessionService.createSession(
        workspace.id,
        user.id,
        null,
        ImportSessionMode.PREVIEW,
        'file-hash-7',
        'original3.csv',
        1000,
      );

      await importSessionService.processImport(session1.id, initialTransactions, ImportSessionMode.PREVIEW);
      const commit1 = await importSessionService.processImport(session1.id, [], ImportSessionMode.COMMIT);

      const firstTx = await dataSource.getRepository(Transaction).findOne({
        where: { importSessionId: session1.id },
      });

      // Second import with drift
      const driftedTransactions: ParsedTransaction[] = [
        {
          transactionDate: new Date('2024-01-26'),
          debit: 302.0,
          credit: undefined,
          counterpartyName: 'Supplier ABC Ltd',
          paymentPurpose: 'Materials purchase',
          currency: 'KZT',
        },
      ];

      const session2 = await importSessionService.createSession(
        workspace.id,
        user.id,
        null,
        ImportSessionMode.PREVIEW,
        'file-hash-8',
        'drifted3.csv',
        1000,
      );

      const previewResult = await importSessionService.processImport(
        session2.id,
        driftedTransactions,
        ImportSessionMode.PREVIEW,
      );

      expect(previewResult.summary.conflictedCount).toBe(1);

      // Resolve as mark_duplicate
      await importSessionService.resolveConflicts(session2.id, { 0: 'mark_duplicate' });

      const commitResult = await importSessionService.processImport(session2.id, [], ImportSessionMode.COMMIT);

      expect(commitResult.summary.matchedCount).toBe(1);

      // Verify 2 transactions, second is marked as duplicate
      const allTransactions = await dataSource.getRepository(Transaction).find({
        where: { workspaceId: workspace.id },
        order: { createdAt: 'ASC' },
      });

      expect(allTransactions).toHaveLength(2);
      expect(allTransactions[0].isDuplicate).toBe(false);
      expect(allTransactions[1].isDuplicate).toBe(true);
      expect(allTransactions[1].duplicateOfId).toBe(firstTx.id);
      expect(allTransactions[1].duplicateConfidence).toBeGreaterThan(0.8);
      expect(allTransactions[1].duplicateMatchType).toBeDefined();
    });
  });
});
```

### Step 3: Add test script to package.json

Update `backend/package.json`:

```json
{
  "scripts": {
    // ... existing scripts
    "test:integration": "jest --config @tests/integration/jest-integration.config.js --runInBand",
    "test:integration:watch": "jest --config @tests/integration/jest-integration.config.js --watch --runInBand"
  }
}
```

### Step 4: Create .env.test if missing

```bash
# Create backend/.env.test
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=lumio_test
JWT_SECRET=test-secret
JWT_REFRESH_SECRET=test-refresh-secret
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Step 5: Run integration tests

Run: `cd backend && npm run test:integration`

Expected: PASS - All integration tests should pass with real database.

### Step 6: Commit

```bash
git add backend/@tests/integration/ backend/package.json backend/.env.test
git commit -m "test(import): add end-to-end integration tests for import flow

- Test initial import with no duplicates
- Test re-upload of identical file (exact fingerprint matches)
- Test overlapping statement with date/amount drift (fuzzy conflicts)
- Test conflict resolution: skip, force_import, mark_duplicate
- Verify fingerprint generation, isDuplicate flag, duplicateOfId linkage
- Use real PostgreSQL database for integration testing
- Run tests serially (--runInBand) to avoid conflicts"
```

---

## Task 8: Add Navigation Link and Update Upload Flow

**Files:**
- Modify: `frontend/app/components/Navigation.tsx`
- Modify: `frontend/app/statements/page.tsx`

### Step 1: Update statements list to show import status

Update `frontend/app/statements/page.tsx`:

```typescript
// Around the statements table, add a column for import status
<TableCell>
  {statement.parsingDetails?.importSession?.conflictedCount > 0 ? (
    <Badge variant="warning">
      {statement.parsingDetails.importSession.conflictedCount} Conflicts
    </Badge>
  ) : statement.status === 'validated' ? (
    <Badge variant="success">Imported</Badge>
  ) : (
    <Badge variant="default">{statement.status}</Badge>
  )}
</TableCell>

// Add action button for statements with conflicts
{statement.parsingDetails?.importSession?.conflictedCount > 0 && (
  <Button
    size="sm"
    variant="outline"
    onClick={() => router.push(`/statements/${statement.id}/import-preview`)}
  >
    Resolve Conflicts
  </Button>
)}
```

### Step 2: Commit

```bash
git add frontend/app/statements/page.tsx
git commit -m "feat(frontend): show import status and conflict resolution link

- Display conflict count badge for statements with unresolved conflicts
- Add 'Resolve Conflicts' button to navigate to import preview page
- Show import status in statements list"
```

---

## Summary

This implementation plan provides a complete, test-driven approach to integrating the idempotent import flow into the Lumio application. Key achievements:

1. **Fuzzy Conflict Detection** - Loads candidate transactions by date/amount window for tolerant matching
2. **Import Session Integration** - Statement processing uses preview/commit workflow instead of direct saves
3. **API Endpoints** - RESTful endpoints for preview, commit, and cancel operations
4. **Frontend UI** - Conflict review table with resolution actions
5. **Integration Tests** - Comprehensive end-to-end tests covering all scenarios

The plan follows TDD principles with failing tests first, minimal implementations, and frequent commits. Each task is broken into 2-5 minute steps for easy execution.

★ Insight ─────────────────────────────────────
**Key architectural decisions:**
1. **Stateless commit** - Parsed transactions stored in session metadata enable API-based workflow without re-parsing
2. **Window-based candidate loading** - Fuzzy matching requires loading transactions in expanded date/amount range, not just exact fingerprints
3. **Auto-commit for no conflicts** - UX optimization: statements without conflicts proceed automatically, manual review only when needed
─────────────────────────────────────────────────
