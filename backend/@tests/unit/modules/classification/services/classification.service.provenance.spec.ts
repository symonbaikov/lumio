import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Branch } from '../../../../../src/entities/branch.entity';
import { CategorizationRule } from '../../../../../src/entities/categorization-rule.entity';
import { Category } from '../../../../../src/entities/category.entity';
import { CategoryLearning } from '../../../../../src/entities/category-learning.entity';
import {
  type Transaction,
  TransactionCategorySource,
  TransactionType,
} from '../../../../../src/entities/transaction.entity';
import { Wallet } from '../../../../../src/entities/wallet.entity';
import { Workspace } from '../../../../../src/entities/workspace.entity';
import { ApplicationSettingsService } from '../../../../../src/modules/application-settings/application-settings.service';
import { AuditService } from '../../../../../src/modules/audit/audit.service';
import { CategoriesService } from '../../../../../src/modules/categories/categories.service';
import { ClassificationService } from '../../../../../src/modules/classification/services/classification.service';

/**
 * Where a category came from, and the switches that decide which steps may run:
 * the behaviour Monarch and YNAB users complained about in 2026 — a model that
 * overrides rules, learning that flips on one correction, no way to turn it off.
 */
describe('ClassificationService provenance and switches', () => {
  let service: ClassificationService;
  let module: TestingModule;

  const learningRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((payload: Partial<CategoryLearning>) => payload as CategoryLearning),
    save: jest.fn(async (payload: unknown) => payload),
  };
  const workspaceRepository = { findOne: jest.fn() };
  const ruleRepository = { find: jest.fn(async () => []) };
  const categoryRepository = {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    create: jest.fn(),
    save: jest.fn(),
  };
  const cache = { get: jest.fn(async () => undefined), set: jest.fn(), del: jest.fn() };
  const applicationSettings = { getAiSettingsForWorkspaceId: jest.fn(async () => null) };
  const categoriesService = { findAll: jest.fn(async () => []) };

  const tx = (overrides: Partial<Transaction> = {}): Transaction =>
    ({
      id: undefined,
      workspaceId: 'ws-1',
      counterpartyName: 'Magnum',
      paymentPurpose: 'Groceries',
      debit: 100,
      credit: null,
      amount: 100,
      transactionType: TransactionType.EXPENSE,
      ...overrides,
    }) as Transaction;

  function settings(processing: Record<string, unknown>) {
    workspaceRepository.findOne.mockResolvedValue({ id: 'ws-1', settings: { processing } });
  }

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        ClassificationService,
        { provide: getRepositoryToken(Category), useValue: categoryRepository },
        { provide: getRepositoryToken(CategoryLearning), useValue: learningRepository },
        { provide: getRepositoryToken(Branch), useValue: { find: jest.fn(async () => []) } },
        {
          provide: getRepositoryToken(Wallet),
          useValue: { find: jest.fn(async () => []), findOne: jest.fn(async () => null) },
        },
        { provide: getRepositoryToken(CategorizationRule), useValue: ruleRepository },
        { provide: getRepositoryToken(Workspace), useValue: workspaceRepository },
        { provide: CACHE_MANAGER, useValue: cache },
        { provide: AuditService, useValue: { createEvent: jest.fn() } },
        { provide: CategoriesService, useValue: categoriesService },
        { provide: ApplicationSettingsService, useValue: applicationSettings },
      ],
    }).compile();
    service = module.get(ClassificationService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    cache.get.mockResolvedValue(undefined);
    categoriesService.findAll.mockResolvedValue([]);
    ruleRepository.find.mockResolvedValue([]);
    learningRepository.find.mockResolvedValue([]);
    learningRepository.findOne.mockResolvedValue(null);
    settings({});
  });

  describe('category source', () => {
    it('names the rule that matched', async () => {
      jest.spyOn<any, any>(service as any, 'getClassificationRules').mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Magnum is groceries',
          priority: 500,
          isActive: true,
          conditions: [{ field: 'counterparty_name', operator: 'contains', value: 'magnum' }],
          result: { categoryId: 'cat-groceries' },
        },
      ]);

      const result = await service.classifyTransaction(tx(), 'u1');

      expect(result).toMatchObject({
        categoryId: 'cat-groceries',
        categorySource: TransactionCategorySource.RULE,
        categoryReason: 'Magnum is groceries',
      });
    });

    it('marks the uncategorised fallback as default so the model may still step in', async () => {
      jest.spyOn<any, any>(service as any, 'getClassificationRules').mockResolvedValue([]);
      jest.spyOn(service, 'ensureCategory').mockResolvedValue('cat-none');
      jest.spyOn<any, any>(service as any, 'findCategoryByHistory').mockResolvedValue(null);

      const result = await service.classifyTransaction(tx({ counterpartyName: 'Zzz' }), 'u1');

      expect(result.categorySource).toBe(TransactionCategorySource.DEFAULT);
      expect(result.categoryReason).toBeNull();
    });

    it('reports the learned payee and whether the user or the model taught it', async () => {
      jest.spyOn<any, any>(service as any, 'getClassificationRules').mockResolvedValue([]);
      learningRepository.find.mockResolvedValue([
        {
          categoryId: 'cat-ai',
          paymentPurpose: 'Groceries',
          counterpartyName: 'Magnum',
          learnedFrom: 'ai_classification',
          confidence: 1,
        },
        {
          categoryId: 'cat-user',
          paymentPurpose: 'Groceries',
          counterpartyName: 'Magnum',
          learnedFrom: 'manual_correction',
          confidence: 0.8,
        },
      ]);

      const result = await (service as any).autoClassifyCategory(
        tx(),
        'u1',
        TransactionType.EXPENSE,
        'ws-1',
      );

      // The user's pattern wins over the model's despite the lower confidence.
      expect(result).toEqual({
        categoryId: 'cat-user',
        source: TransactionCategorySource.LEARNED,
        reason: 'Magnum',
      });
    });
  });

  describe('switches', () => {
    it('skips the model entirely when AI categorisation is off', async () => {
      settings({ aiCategorization: false });

      const result = await service.classifyTransactionsBatch(
        [
          {
            index: 0,
            counterpartyName: 'Magnum',
            paymentPurpose: 'Groceries',
            transactionType: TransactionType.EXPENSE,
          },
        ],
        'ws-1',
        'u1',
      );

      expect(result.size).toBe(0);
      expect(applicationSettings.getAiSettingsForWorkspaceId).not.toHaveBeenCalled();
    });

    it('ignores what the model taught when AI categorisation is off', async () => {
      settings({ aiCategorization: false });
      learningRepository.find.mockResolvedValue([
        {
          categoryId: 'cat-ai',
          paymentPurpose: 'Groceries',
          counterpartyName: 'Magnum',
          learnedFrom: 'ai_classification',
          confidence: 1,
        },
      ]);

      const result = await (service as any).matchByLearnedPatterns(
        tx(),
        'u1',
        TransactionType.EXPENSE,
        'ws-1',
      );

      expect(result).toBeUndefined();
    });

    it('neither reads nor writes learned patterns when learning is off', async () => {
      settings({ merchantLearning: false });

      await service.learnFromCorrection(tx(), 'cat-new', 'u1');
      const match = await (service as any).matchByLearnedPatterns(
        tx(),
        'u1',
        TransactionType.EXPENSE,
        'ws-1',
      );

      expect(learningRepository.save).not.toHaveBeenCalled();
      expect(learningRepository.find).not.toHaveBeenCalled();
      expect(match).toBeUndefined();
    });
  });

  describe('two corrections before a payee flips', () => {
    const established = () => ({
      id: 'p-groceries',
      categoryId: 'cat-groceries',
      paymentPurpose: 'Groceries',
      counterpartyName: 'Magnum',
      learnedFrom: 'manual_correction',
      confidence: 1,
      occurrences: 3,
    });

    it('keeps a one-off correction provisional while the old pattern stands', async () => {
      learningRepository.find.mockResolvedValue([established()]);

      await service.learnFromCorrection(tx(), 'cat-gifts', 'u1');

      const saved = learningRepository.save.mock.calls.map(call => call[0]);
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({ categoryId: 'cat-gifts', confidence: 0.6, occurrences: 1 });
    });

    it('promotes the second correction and demotes the pattern it replaces', async () => {
      const old = established();
      learningRepository.find.mockResolvedValue([old]);
      learningRepository.findOne.mockResolvedValue({
        id: 'p-gifts',
        categoryId: 'cat-gifts',
        paymentPurpose: 'Groceries',
        counterpartyName: 'Magnum',
        learnedFrom: 'manual_correction',
        confidence: 0.6,
        occurrences: 1,
      });

      await service.learnFromCorrection(tx(), 'cat-gifts', 'u1');

      const saved = learningRepository.save.mock.calls.map(call => call[0]);
      expect(saved[0]).toMatchObject({ categoryId: 'cat-gifts', confidence: 1, occurrences: 2 });
      expect(saved[1]).toEqual([expect.objectContaining({ id: 'p-groceries', confidence: 0.6 })]);
    });

    it('trusts the first correction for a payee nobody taught before', async () => {
      await service.learnFromCorrection(tx(), 'cat-groceries', 'u1');

      const saved = learningRepository.save.mock.calls.map(call => call[0]);
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({ categoryId: 'cat-groceries', confidence: 1, occurrences: 1 });
    });
  });
});
