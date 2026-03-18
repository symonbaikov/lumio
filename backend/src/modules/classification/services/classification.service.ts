import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import type { Repository } from 'typeorm';
import { ActorType, AuditAction, EntityType } from '../../../entities/audit-event.entity';
import { Branch } from '../../../entities/branch.entity';
import { CategorizationRule } from '../../../entities/categorization-rule.entity';
import { CategoryLearning } from '../../../entities/category-learning.entity';
import { Category, CategorySource, CategoryType } from '../../../entities/category.entity';
import { type Transaction, TransactionType } from '../../../entities/transaction.entity';
import { Wallet } from '../../../entities/wallet.entity';
import { AuditService } from '../../audit/audit.service';
import { CategoriesService } from '../../categories/categories.service';
import {
  AiCategoryClassifier,
  type AiCategoryMatch,
} from '../helpers/ai-category-classifier.helper';
import {
  type ClassificationCondition,
  ClassificationResult,
  type ClassificationRule,
} from '../interfaces/classification-rule.interface';

type BatchTransactionClassificationInput = {
  index: number;
  counterpartyName: string;
  paymentPurpose: string;
  transactionType: TransactionType;
};

@Injectable()
export class ClassificationService {
  private readonly aiCategoryClassifier = new AiCategoryClassifier();

  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(CategoryLearning)
    private categoryLearningRepository: Repository<CategoryLearning>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(CategorizationRule)
    private categorizationRuleRepository: Repository<CategorizationRule>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly auditService: AuditService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async classifyTransaction(
    transaction: Transaction,
    userId: string,
    batchId?: string | null,
  ): Promise<Partial<Transaction>> {
    const classification: Partial<Transaction> = {};
    const workspaceId = transaction.workspaceId || null;
    let matchedRule: ClassificationRule | null = null;

    // Determine transaction type (income/expense)
    if (transaction.debit && transaction.debit > 0) {
      classification.transactionType = TransactionType.EXPENSE;
    } else if (transaction.credit && transaction.credit > 0) {
      classification.transactionType = TransactionType.INCOME;
    }

    // Check cache first
    const cacheKey = transaction.id ? `classification:${transaction.id}` : null;
    if (cacheKey) {
      const cached = await this.cacheManager.get<Partial<Transaction>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Get classification rules for user
    const rules = (await this.getClassificationRules(userId, workspaceId)) ?? [];

    // Apply rules in priority order
    for (const rule of rules.sort((a, b) => b.priority - a.priority)) {
      if (this.matchesRule(transaction, rule.conditions)) {
        matchedRule = rule;
        // Apply rule result
        if (rule.result.categoryId) {
          classification.categoryId = rule.result.categoryId;
        }
        if (rule.result.branchId) {
          classification.branchId = rule.result.branchId;
        }
        if (rule.result.walletId) {
          classification.walletId = rule.result.walletId;
        }
        if (rule.result.article) {
          classification.article = rule.result.article;
        }
        if (rule.result.activityType) {
          classification.activityType = rule.result.activityType;
        }

        // Stop at first matching rule (highest priority)
        break;
      }
    }

    // Auto-classify category if not set
    if (!classification.categoryId) {
      classification.categoryId = await this.autoClassifyCategory(
        transaction,
        userId,
        classification.transactionType || TransactionType.EXPENSE,
        workspaceId,
      );
    }

    // Auto-determine wallet if not set
    if (!classification.walletId) {
      classification.walletId = await this.autoDetermineWallet(transaction, userId);
    }

    // Auto-determine branch if not set
    if (!classification.branchId) {
      classification.branchId = await this.autoDetermineBranch(transaction, userId);
    }

    // Cache result for 5 minutes
    if (cacheKey) {
      await this.cacheManager.set(cacheKey, classification, 300000); // 5 minutes in ms
    }

    if (matchedRule) {
      // Audit: record rule application for categorization transparency.
      await this.auditService.createEvent({
        workspaceId: transaction.workspaceId ?? null,
        actorType: ActorType.USER,
        actorId: userId,
        entityType: EntityType.TRANSACTION,
        entityId: transaction.id,
        action: AuditAction.APPLY_RULE,
        meta: {
          ruleId: matchedRule.id ?? null,
          ruleName: matchedRule.name,
          confidence: 1,
        },
        batchId: batchId ?? null,
      });
    }

    return classification;
  }

  private matchesRule(transaction: Transaction, conditions: ClassificationCondition[]): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getFieldValue(transaction, condition.field);
      return this.evaluateCondition(fieldValue, condition);
    });
  }

  private getFieldValue(transaction: Transaction, field: string): string | number | null {
    switch (field) {
      case 'counterparty_name':
        return transaction.counterpartyName;
      case 'payment_purpose':
        return transaction.paymentPurpose;
      case 'amount':
        return transaction.amount || transaction.debit || transaction.credit || 0;
      case 'counterparty_bin':
        return transaction.counterpartyBin || null;
      case 'document_number':
        return transaction.documentNumber || null;
      default:
        return null;
    }
  }

  private evaluateCondition(
    fieldValue: string | number | null,
    condition: ClassificationCondition,
  ): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }

    const conditionValue = condition.value;
    const fieldStr = String(fieldValue).toLowerCase();
    const conditionStr = String(conditionValue).toLowerCase();

    switch (condition.operator) {
      case 'contains':
        return fieldStr.includes(conditionStr);
      case 'equals':
        return fieldStr === conditionStr;
      case 'starts_with':
        return fieldStr.startsWith(conditionStr);
      case 'ends_with':
        return fieldStr.endsWith(conditionStr);
      case 'regex':
        try {
          const regex = new RegExp(conditionValue as string, 'i');
          return regex.test(fieldStr);
        } catch {
          return false;
        }
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      default:
        return false;
    }
  }

  private async autoClassifyCategory(
    transaction: Transaction,
    userId: string,
    transactionType: TransactionType,
    workspaceId: string | null = null,
  ): Promise<string | undefined> {
    // Look for common patterns in counterparty name or purpose
    const searchText =
      `${transaction.counterpartyName} ${transaction.paymentPurpose}`.toLowerCase();

    if (workspaceId) {
      const workspaceCategoryId = await this.matchWorkspaceCategories(
        searchText,
        workspaceId,
        transactionType,
      );
      if (workspaceCategoryId) {
        return workspaceCategoryId;
      }
    }

    // Common patterns for Kaspi and other banks
    const patterns: Array<{ pattern: RegExp; categoryName: string }> = [
      // Kaspi specific
      { pattern: /kaspi red/i, categoryName: 'Платежи Kaspi Red' },
      { pattern: /продажи\s+с\s+kaspi/i, categoryName: 'Продажи Kaspi' },
      { pattern: /бонусы?\s+за\s+отзыв/i, categoryName: 'Маркетинг и реклама' },
      {
        pattern: /kaspi\s+доставка|доставк.*kaspi/i,
        categoryName: 'Логистика и доставка',
      },
      {
        pattern: /рекламн.*услуг|услуг.*рекламн/i,
        categoryName: 'Маркетинг и реклама',
      },
      {
        pattern: /информационно.*технолог|IT.*услуг/i,
        categoryName: 'IT услуги',
      },
      {
        pattern: /комисси.*kaspi|kaspi.*комисси/i,
        categoryName: 'Комиссии банка',
      },
      {
        pattern: /перевод\s+собственных\s+средств/i,
        categoryName: 'Внутренние переводы',
      },
      {
        pattern: /резервирование.*кредит|погашение.*кредит/i,
        categoryName: 'Кредиты и займы',
      },
      { pattern: /kaspi\s+gold|gold.*карт/i, categoryName: 'Комиссии банка' },
      { pattern: /kaspi\s+магазин/i, categoryName: 'Комиссии Kaspi' },
      { pattern: /kaspi\s*pay/i, categoryName: 'Комиссии Kaspi' },
      // General patterns
      { pattern: /зарплат/i, categoryName: 'Зарплаты сотрудникам' },
      { pattern: /аренд/i, categoryName: 'Аренда' },
      { pattern: /коммунал/i, categoryName: 'Коммунальные услуги' },
      { pattern: /налог/i, categoryName: 'Налоги' },
      { pattern: /поступлени|приход/i, categoryName: 'Приход' },
      { pattern: /оплата\s+услуг/i, categoryName: 'Оплата услуг' },
      { pattern: /закуп|товар/i, categoryName: 'Закупки товаров' },
      { pattern: /страхов/i, categoryName: 'Страхование' },
      { pattern: /доставк|курьер/i, categoryName: 'Логистика и доставка' },
      { pattern: /маркетинг|реклам/i, categoryName: 'Маркетинг и реклама' },
      { pattern: /комисси/i, categoryName: 'Комиссии банка' },
      { pattern: /кредит|лизинг|займ/i, categoryName: 'Кредиты и займы' },
    ];

    for (const { pattern, categoryName } of patterns) {
      if (pattern.test(searchText)) {
        const categoryId = await this.ensureCategory(
          userId,
          categoryName,
          transactionType === TransactionType.INCOME ? CategoryType.INCOME : CategoryType.EXPENSE,
          undefined,
          workspaceId,
        );

        if (categoryId) {
          return categoryId;
        }
      }
    }

    // Try ML-based learned patterns
    const learnedMatch = await this.matchByLearnedPatterns(
      transaction,
      userId,
      transactionType,
      workspaceId,
    );
    if (learnedMatch) {
      return learnedMatch;
    }

    // Try to find category by historical data
    const historicalCategory = await this.findCategoryByHistory(transaction, userId, workspaceId);
    if (historicalCategory) {
      return historicalCategory.id;
    }

    // FALLBACK: Create "Uncategorized" to ensure transaction is categorized
    return await this.ensureCategory(
      userId,
      'Без категории',
      transactionType === TransactionType.INCOME ? CategoryType.INCOME : CategoryType.EXPENSE,
      undefined,
      workspaceId,
    );
  }

  private async findCategoryByHistory(
    transaction: Transaction,
    userId: string,
    workspaceId: string | null = null,
  ): Promise<Category | null> {
    if (typeof (this.categoryRepository as any).createQueryBuilder !== 'function') {
      // In unit tests repositories are shallow mocks without query builder; skip lookup.
      return null;
    }
    // Find most common category for this counterparty
    // Note: transactions don't have userId, they're linked via statement->user
    const query = this.categoryRepository
      .createQueryBuilder('category')
      .innerJoin('category.transactions', 'transaction')
      .innerJoin('transaction.statement', 'statement')
      .where('transaction.counterpartyName = :counterpartyName', {
        counterpartyName: transaction.counterpartyName,
      })
      .groupBy('category.id')
      .orderBy('COUNT(transaction.id)', 'DESC')
      .limit(1);

    if (workspaceId) {
      query
        .andWhere('statement.workspaceId = :workspaceId', { workspaceId })
        .andWhere('category.workspaceId = :workspaceId', { workspaceId });
    } else {
      query
        .andWhere('statement.userId = :userId', { userId })
        .andWhere('category.userId = :userId', { userId });
    }

    const result = await query.getOne();

    return result || null;
  }

  private async autoDetermineWallet(
    transaction: Transaction,
    userId: string,
  ): Promise<string | undefined> {
    // Try to match by account number if available
    if (transaction.counterpartyAccount) {
      const wallet = await this.walletRepository.findOne({
        where: {
          userId,
          accountNumber: transaction.counterpartyAccount,
        },
      });

      if (wallet) {
        return wallet.id;
      }
    }

    // Match by wallet name presence in purpose/counterparty
    const wallets = await this.walletRepository.find({ where: { userId } });
    const searchText =
      `${transaction.counterpartyName} ${transaction.paymentPurpose}`.toLowerCase();
    const walletMatch = wallets.find(w => searchText.includes((w.name || '').toLowerCase()));
    if (walletMatch) {
      return walletMatch.id;
    }

    // Get default wallet for user
    const defaultWallet = await this.walletRepository.findOne({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    return defaultWallet?.id;
  }

  private async autoDetermineBranch(
    transaction: Transaction,
    userId: string,
  ): Promise<string | undefined> {
    const branches = await this.branchRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    const searchText =
      `${transaction.counterpartyName} ${transaction.paymentPurpose}`.toLowerCase();
    const matched = branches.find(b => searchText.includes((b.name || '').toLowerCase()));
    return (matched || branches[0])?.id;
  }

  private async getClassificationRules(
    userId: string,
    workspaceId: string | null = null,
  ): Promise<ClassificationRule[]> {
    // Load user-defined categorization rules from database
    const userRules = await this.categorizationRuleRepository.find({
      where: {
        userId,
        ...(workspaceId ? { workspaceId } : {}),
        isActive: true,
      },
      order: {
        priority: 'DESC',
      },
    });

    // Convert database rules to ClassificationRule format
    const dbRules: ClassificationRule[] = userRules.map(rule => ({
      id: rule.id,
      name: rule.name,
      type: 'category',
      conditions: rule.conditions,
      result: rule.result,
      priority: rule.priority,
      isActive: rule.isActive,
    }));

    // Default system rules (templates)
    const templates: Array<{
      name: string;
      field: ClassificationCondition['field'];
      operator: ClassificationCondition['operator'];
      value: string;
      category: string;
      type: CategoryType;
      priority: number;
      article?: string;
    }> = [
      {
        name: 'Kaspi Red payments',
        field: 'payment_purpose',
        operator: 'contains',
        value: 'kaspi red',
        category: 'Платежи Kaspi Red',
        type: CategoryType.EXPENSE,
        priority: 110,
      },
      {
        name: 'Kaspi Pay/комиссии',
        field: 'payment_purpose',
        operator: 'regex',
        value: 'kaspi\\s*pay|комисси.*kaspi',
        category: 'Комиссии Kaspi',
        type: CategoryType.EXPENSE,
        priority: 105,
      },
      {
        name: 'Kaspi sales',
        field: 'payment_purpose',
        operator: 'contains',
        value: 'продажи kaspi',
        category: 'Продажи Kaspi',
        type: CategoryType.INCOME,
        priority: 100,
      },
      {
        name: 'Salary payments',
        field: 'payment_purpose',
        operator: 'contains',
        value: 'зарплат',
        category: 'Зарплаты сотрудникам',
        type: CategoryType.EXPENSE,
        priority: 95,
      },
      {
        name: 'Rent',
        field: 'payment_purpose',
        operator: 'contains',
        value: 'аренд',
        category: 'Аренда',
        type: CategoryType.EXPENSE,
        priority: 90,
      },
      {
        name: 'Taxes',
        field: 'payment_purpose',
        operator: 'regex',
        value: 'налог|гпн|опв|осМС|соц(\\s|$)',
        category: 'Налоги',
        type: CategoryType.EXPENSE,
        priority: 88,
      },
      {
        name: 'Utilities',
        field: 'payment_purpose',
        operator: 'regex',
        value: 'коммунал|электр|газ|тепл|свет',
        category: 'Коммунальные услуги',
        type: CategoryType.EXPENSE,
        priority: 85,
      },
      {
        name: 'Marketing',
        field: 'payment_purpose',
        operator: 'regex',
        value: 'реклам|маркетинг',
        category: 'Маркетинг и реклама',
        type: CategoryType.EXPENSE,
        priority: 80,
      },
      {
        name: 'Logistics',
        field: 'payment_purpose',
        operator: 'contains',
        value: 'достав',
        category: 'Логистика и доставка',
        type: CategoryType.EXPENSE,
        priority: 75,
      },
      {
        name: 'Bank commission',
        field: 'payment_purpose',
        operator: 'contains',
        value: 'комисси',
        category: 'Комиссии банка',
        type: CategoryType.EXPENSE,
        priority: 70,
      },
      {
        name: 'Loans/credit',
        field: 'payment_purpose',
        operator: 'regex',
        value: 'кредит|займ|лизинг',
        category: 'Кредиты и займы',
        type: CategoryType.EXPENSE,
        priority: 65,
      },
      {
        name: 'Incoming payments',
        field: 'payment_purpose',
        operator: 'regex',
        value: 'поступлени|приход|оплата товара',
        category: 'Приход',
        type: CategoryType.INCOME,
        priority: 60,
      },
    ];

    const rules: ClassificationRule[] = [];
    for (const template of templates) {
      const categoryId = await this.ensureCategory(
        userId,
        template.category,
        template.type,
        undefined,
        workspaceId,
      );
      if (!categoryId) continue;

      rules.push({
        name: template.name,
        type: 'category',
        conditions: [
          {
            field: template.field,
            operator: template.operator,
            value: template.value,
          },
        ],
        result: {
          categoryId,
          article: template.article,
        },
        priority: template.priority,
        isActive: true,
      });
    }

    // Merge user rules with system rules (user rules have higher priority)
    return [...dbRules, ...rules].sort((a, b) => b.priority - a.priority);
  }

  private async getCategoryIdByName(
    userId: string,
    categoryName: string,
  ): Promise<string | undefined> {
    return this.ensureCategory(userId, categoryName);
  }

  private async matchWorkspaceCategories(
    searchText: string,
    workspaceId: string,
    transactionType: TransactionType,
  ): Promise<string | undefined> {
    const type =
      transactionType === TransactionType.INCOME ? CategoryType.INCOME : CategoryType.EXPENSE;
    const categories = (await this.categoriesService.findAll(workspaceId, type)) ?? [];

    const searchTokens = this.tokenizeForCategoryMatch(searchText);

    for (const category of categories) {
      if (category.isEnabled === false) {
        continue;
      }

      const normalizedName = category.name.trim().toLowerCase();
      if (normalizedName === 'без категории' || normalizedName === 'other') {
        continue;
      }

      const words = this.tokenizeForCategoryMatch(normalizedName).filter(word => word.length >= 3);
      if (!words.length) {
        continue;
      }

      const matchedWords = words.filter(word =>
        searchTokens.some(token => this.categoryWordsMatch(word, token)),
      );
      if (matchedWords.length / words.length >= 0.7) {
        return category.id;
      }
    }

    return undefined;
  }

  async classifyBulk(transactionIds: string[], userId: string): Promise<void> {
    // TODO: Implement bulk classification
    // This would process multiple transactions at once
  }

  async classifyTransactionsBatch(
    transactions: BatchTransactionClassificationInput[],
    workspaceId: string,
    userId: string,
  ): Promise<Map<number, string>> {
    const categoryByIndex = new Map<number, string>();

    if (!transactions.length || !workspaceId || !this.aiCategoryClassifier.isAvailable()) {
      return categoryByIndex;
    }

    const incomeTransactions = transactions.filter(
      tx => tx.transactionType === TransactionType.INCOME,
    );
    const expenseTransactions = transactions.filter(
      tx => tx.transactionType === TransactionType.EXPENSE,
    );

    const [incomeCategories, expenseCategories] = await Promise.all([
      this.getAiCategoryOptions(workspaceId, CategoryType.INCOME),
      this.getAiCategoryOptions(workspaceId, CategoryType.EXPENSE),
    ]);

    const [incomeResult, expenseResult] = await Promise.all([
      this.classifyTransactionGroupWithAi(incomeTransactions, incomeCategories),
      this.classifyTransactionGroupWithAi(expenseTransactions, expenseCategories),
    ]);

    const matches = [...incomeResult, ...expenseResult];
    const transactionByIndex = new Map(transactions.map(tx => [tx.index, tx]));

    for (const match of matches) {
      categoryByIndex.set(match.index, match.categoryId);
      const tx = transactionByIndex.get(match.index);
      if (!tx) {
        continue;
      }
      await this.learnFromAiClassification(workspaceId, userId, tx, match);
    }

    return categoryByIndex;
  }

  private async classifyTransactionGroupWithAi(
    transactions: BatchTransactionClassificationInput[],
    categories: Array<{ id: string; name: string }>,
  ): Promise<AiCategoryMatch[]> {
    if (!transactions.length || !categories.length) {
      return [];
    }

    const result = await this.aiCategoryClassifier.classifyBatch(
      transactions.map(tx => ({
        index: tx.index,
        counterpartyName: tx.counterpartyName,
        paymentPurpose: tx.paymentPurpose,
      })),
      categories,
    );

    return result.matches;
  }

  private async getAiCategoryOptions(
    workspaceId: string,
    type: CategoryType,
  ): Promise<Array<{ id: string; name: string }>> {
    const categories = await this.categoriesService.findAll(workspaceId, type);
    return categories
      .filter(category => category.isEnabled !== false)
      .filter(category => category.name.trim().toLowerCase() !== 'без категории')
      .map(category => ({ id: category.id, name: category.name }));
  }

  private async ensureCategory(
    userId: string,
    categoryName: string,
    type: CategoryType = CategoryType.EXPENSE,
    color?: string,
    workspaceId: string | null = null,
  ): Promise<string | undefined> {
    if (workspaceId) {
      const workspaceCategory = await this.categoryRepository.findOne({
        where: { workspaceId, name: categoryName, type },
      });

      if (workspaceCategory) {
        if (!workspaceCategory.color && color) {
          workspaceCategory.color = color;
          await this.categoryRepository.save(workspaceCategory);
        }

        return workspaceCategory.id;
      }
    }

    let category = await this.categoryRepository.findOne({
      where: { userId, name: categoryName, type },
    });

    if (workspaceId && category && category.workspaceId !== workspaceId) {
      category = null;
    }

    if (!category) {
      category = this.categoryRepository.create({
        userId,
        workspaceId,
        name: categoryName,
        type,
        isSystem: false,
        source: workspaceId ? CategorySource.PARSING : CategorySource.USER,
        color,
      });
      category = await this.categoryRepository.save(category);
      if (workspaceId) {
        await this.invalidateWorkspaceCategoriesCache(workspaceId);
      }
    } else if (!category.color && color) {
      if (workspaceId && category.source !== CategorySource.PARSING) {
        category.source = CategorySource.PARSING;
      }
      category.color = color;
      await this.categoryRepository.save(category);
    } else if (workspaceId && category.source !== CategorySource.PARSING) {
      category.source = CategorySource.PARSING;
      await this.categoryRepository.save(category);
    }

    return category?.id;
  }

  /**
   * Determine majority category for a statement based on parsed transactions.
   * Returns existing category if found, otherwise creates one with generated color.
   */
  async determineMajorityCategory(
    transactions: Array<{
      debit?: number | null;
      credit?: number | null;
      paymentPurpose?: string;
      counterpartyName?: string;
    }>,
    userId: string,
    workspaceId: string | null = null,
  ): Promise<{ categoryId?: string; type: CategoryType }> {
    const totalDebit = transactions.reduce((sum, t) => sum + (t.debit ?? 0), 0);
    const totalCredit = transactions.reduce((sum, t) => sum + (t.credit ?? 0), 0);
    const type = totalDebit >= totalCredit ? CategoryType.EXPENSE : CategoryType.INCOME;

    const relevant = transactions.filter(t =>
      type === CategoryType.EXPENSE ? (t.debit ?? 0) > 0 : (t.credit ?? 0) > 0,
    );

    const keyword = this.extractDominantKeyword(relevant);
    const name =
      keyword && keyword.length > 0
        ? `${type === CategoryType.EXPENSE ? 'Расходы' : 'Доходы'}: ${keyword}`
        : type === CategoryType.EXPENSE
          ? 'Расходы'
          : 'Доходы';

    const color = this.pickColor(name);
    const categoryId = await this.ensureCategory(userId, name, type, color, workspaceId);
    return { categoryId, type };
  }

  private async invalidateWorkspaceCategoriesCache(workspaceId: string): Promise<void> {
    await this.cacheManager.del(`categories:${workspaceId}:all`);
    await this.cacheManager.del(`categories:${workspaceId}:${CategoryType.INCOME}`);
    await this.cacheManager.del(`categories:${workspaceId}:${CategoryType.EXPENSE}`);
  }

  private tokenizeForCategoryMatch(value: string): string[] {
    return value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .split(/\s+/)
      .map(token => token.trim())
      .filter(Boolean);
  }

  private categoryWordsMatch(categoryWord: string, searchWord: string): boolean {
    if (categoryWord === searchWord) {
      return true;
    }

    if (categoryWord.includes(searchWord) || searchWord.includes(categoryWord)) {
      return true;
    }

    const minPrefixLength = Math.min(4, categoryWord.length, searchWord.length);
    if (minPrefixLength >= 3) {
      return categoryWord.slice(0, minPrefixLength) === searchWord.slice(0, minPrefixLength);
    }

    return false;
  }

  private extractDominantKeyword(
    transactions: Array<{ paymentPurpose?: string; counterpartyName?: string }>,
  ): string {
    const text = transactions
      .map(t =>
        `${t.paymentPurpose || ''} ${t.counterpartyName || ''}`
          .replace(/[.,;:()/\\\-\d]+/g, ' ')
          .toLowerCase(),
      )
      .join(' ');

    const stopWords = new Set([
      'оплата',
      'платеж',
      'платежа',
      'перевод',
      'перечисление',
      'за',
      'и',
      'в',
      'на',
      'по',
      'заказ',
      'товар',
      'услуга',
      'услуг',
      'казахстан',
      'тариф',
      'счета',
      'счет',
      'номер',
      'период',
      'месяц',
      'год',
      'указано',
      'указан',
      'указана',
    ]);

    const words = text.split(/\s+/).filter(w => w.length >= 4 && !stopWords.has(w));

    const freq = new Map<string, number>();
    words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
    const top = Array.from(freq.entries()).sort((a, b) => b[1] - a[1])[0];
    if (!top) return '';
    return top[0].charAt(0).toUpperCase() + top[0].slice(1);
  }

  private pickColor(key: string): string {
    const palette = [
      '#4F46E5', // indigo
      '#0EA5E9', // sky
      '#10B981', // emerald
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // violet
      '#EC4899', // pink
      '#22C55E', // green
      '#F97316', // orange
      '#14B8A6', // teal
    ];
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    return palette[hash % palette.length];
  }

  /**
   * Record a user correction for ML learning
   */
  async learnFromCorrection(
    transaction: Transaction,
    newCategoryId: string,
    userId: string,
  ): Promise<void> {
    const workspaceId = transaction.workspaceId || null;

    const lookupWhere = workspaceId
      ? {
          workspaceId,
          categoryId: newCategoryId,
          paymentPurpose: transaction.paymentPurpose || '',
        }
      : {
          userId,
          categoryId: newCategoryId,
          paymentPurpose: transaction.paymentPurpose || '',
        };

    // Check if similar pattern already exists
    const existing = await this.categoryLearningRepository.findOne({
      where: lookupWhere,
    });

    if (existing) {
      // Increment occurrences for confidence boost
      existing.occurrences += 1;
      existing.confidence = Math.min(1.0, Number(existing.confidence) + 0.05);
      await this.categoryLearningRepository.save(existing);
    } else {
      // Create new learning entry
      await this.categoryLearningRepository.save({
        userId,
        workspaceId,
        categoryId: newCategoryId,
        paymentPurpose: transaction.paymentPurpose || '',
        counterpartyName: transaction.counterpartyName || null,
        learnedFrom: 'manual_correction',
        confidence: 1.0,
        occurrences: 1,
      } as any);
    }

    // Invalidate learned patterns cache for this user
    await this.cacheManager.del(this.getLearnedPatternsCacheKey(userId, workspaceId));
  }

  /**
   * Match transaction against learned patterns using similarity
   */
  private async matchByLearnedPatterns(
    transaction: Transaction,
    userId: string,
    transactionType: TransactionType,
    workspaceId: string | null = null,
  ): Promise<string | undefined> {
    const cacheKey = this.getLearnedPatternsCacheKey(userId, workspaceId);

    // Try to get from cache
    let learnedPatterns = await this.cacheManager.get<CategoryLearning[]>(cacheKey);

    if (!learnedPatterns) {
      // Get learned patterns for this user from DB
      learnedPatterns = await this.categoryLearningRepository.find({
        where: workspaceId ? { workspaceId } : { userId },
        order: { confidence: 'DESC', createdAt: 'DESC' },
        take: 100, // Limit for performance
      });

      // Cache for 10 minutes
      await this.cacheManager.set(cacheKey, learnedPatterns, 600000); // 10 minutes in ms
    }

    if (!learnedPatterns || learnedPatterns.length === 0) return undefined;

    // Calculate similarity scores
    const searchText =
      `${transaction.paymentPurpose} ${transaction.counterpartyName}`.toLowerCase();

    let bestMatch: { categoryId: string; score: number } | null = null;

    for (const pattern of learnedPatterns) {
      const patternText =
        `${pattern.paymentPurpose} ${pattern.counterpartyName || ''}`.toLowerCase();

      const score = this.calculateTextSimilarity(searchText, patternText);

      // Consider confidence in scoring (boost high-confidence patterns)
      const weightedScore = score * Number(pattern.confidence);

      // Threshold: 0.7 weighted score to accept match
      if (weightedScore > 0.7 && (!bestMatch || weightedScore > bestMatch.score)) {
        bestMatch = { categoryId: pattern.categoryId, score: weightedScore };
      }
    }

    return bestMatch?.categoryId;
  }

  private async learnFromAiClassification(
    workspaceId: string,
    userId: string,
    transaction: BatchTransactionClassificationInput,
    match: AiCategoryMatch,
  ): Promise<void> {
    try {
      const paymentPurpose = transaction.paymentPurpose || '';
      const counterpartyName = transaction.counterpartyName || null;

      const existing = await this.categoryLearningRepository.findOne({
        where: {
          workspaceId,
          categoryId: match.categoryId,
          paymentPurpose,
          counterpartyName,
        },
      });

      if (existing) {
        existing.occurrences += 1;
        existing.confidence = Math.min(
          1,
          (Number(existing.confidence) + Number(match.confidence)) / 2,
        );
        existing.learnedFrom = 'ai_classification';
        await this.categoryLearningRepository.save(existing);
      } else {
        await this.categoryLearningRepository.save({
          userId,
          workspaceId,
          categoryId: match.categoryId,
          paymentPurpose,
          counterpartyName,
          learnedFrom: 'ai_classification',
          confidence: Number(match.confidence),
          occurrences: 1,
        } as CategoryLearning);
      }

      await this.cacheManager.del(this.getLearnedPatternsCacheKey(userId, workspaceId));
    } catch (error) {
      console.error('[ClassificationService] Failed to persist AI learning:', error);
    }
  }

  private getLearnedPatternsCacheKey(userId: string, workspaceId: string | null): string {
    if (workspaceId) {
      return `learned-patterns:workspace:${workspaceId}`;
    }
    return `learned-patterns:user:${userId}`;
  }

  /**
   * Calculate text similarity using Jaccard index
   * Returns 0.0 - 1.0 (higher = more similar)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple word-based similarity (Jaccard index)
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }
}
