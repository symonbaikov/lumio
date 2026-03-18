import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import type { Repository } from 'typeorm';
import { Statement, Transaction, User, WorkspaceMember, WorkspaceRole } from '../../entities';
import { ActorType, AuditAction, EntityType } from '../../entities/audit-event.entity';
import { Category, CategorySource, CategoryType } from '../../entities/category.entity';
import { AuditService } from '../audit/audit.service';
import type { CategoryChangedEvent } from '../notifications/events/notification-events';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

const DEFAULT_SYSTEM_CATEGORIES: ReadonlyArray<{
  name: string;
  type: CategoryType;
}> = [
  { name: 'Продажи', type: CategoryType.INCOME },
  { name: 'Услуги', type: CategoryType.INCOME },
  { name: 'Процентный доход', type: CategoryType.INCOME },
  { name: 'Прочий доход', type: CategoryType.INCOME },
  { name: 'Реклама', type: CategoryType.EXPENSE },
  { name: 'Льготы и компенсации', type: CategoryType.EXPENSE },
  { name: 'Автомобильные расходы', type: CategoryType.EXPENSE },
  { name: 'Оборудование', type: CategoryType.EXPENSE },
  { name: 'Комиссии и сборы', type: CategoryType.EXPENSE },
  { name: 'Домашний офис', type: CategoryType.EXPENSE },
  { name: 'Страхование', type: CategoryType.EXPENSE },
  { name: 'Проценты', type: CategoryType.EXPENSE },
  { name: 'Оплата труда', type: CategoryType.EXPENSE },
  { name: 'Обслуживание и ремонт', type: CategoryType.EXPENSE },
  { name: 'Материалы', type: CategoryType.EXPENSE },
  { name: 'Питание и представительские расходы', type: CategoryType.EXPENSE },
  { name: 'Канцелярские товары', type: CategoryType.EXPENSE },
  { name: 'Прочие расходы', type: CategoryType.EXPENSE },
  { name: 'Профессиональные услуги', type: CategoryType.EXPENSE },
  { name: 'Аренда', type: CategoryType.EXPENSE },
  { name: 'Налоги', type: CategoryType.EXPENSE },
  { name: 'Командировки', type: CategoryType.EXPENSE },
  { name: 'Коммунальные услуги', type: CategoryType.EXPENSE },
];

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Statement)
    private readonly statementRepository: Repository<Statement>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly auditService: AuditService,
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  private snapshotCategory(category: Category) {
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      workspaceId: category.workspaceId,
      userId: category.userId,
      parentId: category.parentId,
      isSystem: category.isSystem,
      source: category.source,
      isEnabled: category.isEnabled,
      color: category.color,
      icon: category.icon,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private async resolveActorName(userId: string): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['name', 'email'],
    });
    return user?.name || user?.email || 'User';
  }

  private async ensureCanEditCategories(workspaceId: string, userId: string): Promise<void> {
    if (!workspaceId) return;

    const membership = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
      select: ['role', 'permissions'],
    });

    if (!membership) return;
    if ([WorkspaceRole.ADMIN, WorkspaceRole.OWNER].includes(membership.role)) return;
    if (membership.permissions?.canEditCategories === false) {
      throw new ForbiddenException('Недостаточно прав для редактирования категорий');
    }
  }

  async create(
    workspaceId: string,
    userId: string,
    createDto: CreateCategoryDto,
  ): Promise<Category> {
    await this.ensureCanEditCategories(workspaceId, userId);
    // Check for duplicate name
    const existing = await this.categoryRepository.findOne({
      where: { workspaceId, name: createDto.name, type: createDto.type },
    });

    if (existing) {
      throw new ConflictException('Category with this name already exists');
    }

    const category = this.categoryRepository.create({
      workspaceId,
      userId,
      ...createDto,
      isSystem: false,
      source: CategorySource.USER,
      isEnabled: createDto.isEnabled ?? true,
    });

    const saved = await this.categoryRepository.save(category);
    await this.invalidateCache(workspaceId);

    // Audit: track category creation.
    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: userId,
      entityType: EntityType.CATEGORY,
      entityId: saved.id,
      action: AuditAction.CREATE,
      diff: { before: null, after: saved },
      meta: {
        parentId: saved.parentId ?? null,
      },
    });

    this.eventEmitter?.emit('category.changed', {
      workspaceId,
      actorId: userId,
      actorName: await this.resolveActorName(userId),
      action: 'created',
      categoryId: saved.id,
      categoryName: saved.name,
    } satisfies CategoryChangedEvent);

    return saved;
  }

  async findAll(workspaceId: string, type?: CategoryType): Promise<Category[]> {
    const where: any = { workspaceId };
    if (type) {
      where.type = type;
    }

    const cacheKey = `categories:${workspaceId}:${type || 'all'}`;
    const cached = await this.cacheManager.get<Category[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const categories = await this.categoryRepository.find({
      where,
      relations: ['children', 'parent'],
      order: { name: 'ASC' },
    });

    await this.cacheManager.set(cacheKey, categories, 3600000); // 1 hour
    return categories;
  }

  async findOne(id: string, workspaceId: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id, workspaceId },
      relations: ['children', 'parent'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async getWorkspaceCategoryUsageCounts(
    workspaceId: string,
  ): Promise<Record<string, { transactions: number; statements: number; total: number }>> {
    const [transactionsRaw, statementsRaw] = await Promise.all([
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('transaction.categoryId', 'categoryId')
        .addSelect('COUNT(transaction.id)', 'count')
        .innerJoin('transaction.statement', 'statement')
        .where('statement.workspaceId = :workspaceId', { workspaceId })
        .andWhere('transaction.categoryId IS NOT NULL')
        .groupBy('transaction.categoryId')
        .getRawMany(),
      this.statementRepository
        .createQueryBuilder('statement')
        .select('statement.categoryId', 'categoryId')
        .addSelect('COUNT(statement.id)', 'count')
        .where('statement.workspaceId = :workspaceId', { workspaceId })
        .andWhere('statement.categoryId IS NOT NULL')
        .groupBy('statement.categoryId')
        .getRawMany(),
    ]);

    const result: Record<string, { transactions: number; statements: number; total: number }> = {};

    for (const row of transactionsRaw) {
      const catId = row.categoryId;
      result[catId] = { transactions: Number(row.count), statements: 0, total: Number(row.count) };
    }

    for (const row of statementsRaw) {
      const catId = row.categoryId;
      if (!result[catId]) {
        result[catId] = {
          transactions: 0,
          statements: Number(row.count),
          total: Number(row.count),
        };
      } else {
        result[catId].statements = Number(row.count);
        result[catId].total += Number(row.count);
      }
    }

    return result;
  }

  async getCategoryUsageCount(
    categoryId: string,
    workspaceId: string,
  ): Promise<{ transactions: number; statements: number; total: number }> {
    await this.findOne(categoryId, workspaceId);

    const [transactions, statements] = await Promise.all([
      this.transactionRepository
        .createQueryBuilder('transaction')
        .innerJoin('transaction.statement', 'statement')
        .where('transaction.categoryId = :categoryId', { categoryId })
        .andWhere('statement.workspaceId = :workspaceId', { workspaceId })
        .getCount(),
      this.statementRepository.count({
        where: { categoryId, workspaceId },
      }),
    ]);

    return {
      transactions,
      statements,
      total: transactions + statements,
    };
  }

  async update(
    id: string,
    workspaceId: string,
    userId: string,
    updateDto: UpdateCategoryDto,
  ): Promise<Category> {
    await this.ensureCanEditCategories(workspaceId, userId);
    const category = await this.findOne(id, workspaceId);
    const before = this.snapshotCategory(category);

    if (category.isSystem) {
      const nonToggleUpdates = Object.entries(updateDto).filter(
        ([key, value]) => key !== 'isEnabled' && value !== undefined,
      );

      if (nonToggleUpdates.length > 0) {
        throw new ForbiddenException('Cannot modify system category');
      }
    }

    // Check for duplicate name if name is being changed
    if (updateDto.name && updateDto.name !== category.name) {
      const existing = await this.categoryRepository.findOne({
        where: { workspaceId, name: updateDto.name, type: category.type },
      });

      if (existing) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    Object.assign(category, updateDto);
    const saved = await this.categoryRepository.save(category);
    await this.invalidateCache(workspaceId);
    const after = this.snapshotCategory(saved);

    const parentChanged = before.parentId !== saved.parentId;
    // Audit: track category updates with before/after diff.
    try {
      await this.auditService.createEvent({
        workspaceId,
        actorType: ActorType.USER,
        actorId: userId,
        entityType: EntityType.CATEGORY,
        entityId: saved.id,
        action: AuditAction.UPDATE,
        diff: { before, after },
        meta: parentChanged
          ? { parentChange: { from: before.parentId ?? null, to: saved.parentId ?? null } }
          : undefined,
        isUndoable: true,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Audit event failed for category ${saved.id}: ${message}`);
    }

    this.eventEmitter?.emit('category.changed', {
      workspaceId,
      actorId: userId,
      actorName: await this.resolveActorName(userId),
      action: 'updated',
      categoryId: saved.id,
      categoryName: saved.name,
    } satisfies CategoryChangedEvent);

    return saved;
  }

  async remove(id: string, workspaceId: string, userId: string): Promise<void> {
    await this.ensureCanEditCategories(workspaceId, userId);
    const category = await this.findOne(id, workspaceId);

    if (category.isSystem) {
      throw new ForbiddenException('Cannot delete system category');
    }

    await this.categoryRepository.remove(category);
    await this.invalidateCache(workspaceId);

    // Audit: track category deletion for potential rollback.
    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: userId,
      entityType: EntityType.CATEGORY,
      entityId: category.id,
      action: AuditAction.DELETE,
      diff: { before: category, after: null },
      meta: {
        parentId: category.parentId ?? null,
      },
      isUndoable: true,
    });

    this.eventEmitter?.emit('category.changed', {
      workspaceId,
      actorId: userId,
      actorName: await this.resolveActorName(userId),
      action: 'deleted',
      categoryId: category.id,
      categoryName: category.name,
    } satisfies CategoryChangedEvent);
  }

  async createSystemCategories(workspaceId: string, userId?: string): Promise<void> {
    for (const catData of DEFAULT_SYSTEM_CATEGORIES) {
      const existing = await this.categoryRepository.findOne({
        where: { workspaceId, name: catData.name },
      });

      if (!existing) {
        const category = this.categoryRepository.create({
          workspaceId,
          userId,
          isSystem: true,
          source: CategorySource.SYSTEM,
          isEnabled: true,
          ...catData,
        });
        await this.categoryRepository.save(category);
      }
    }
    await this.invalidateCache(workspaceId);
  }

  private async invalidateCache(workspaceId: string): Promise<void> {
    await this.cacheManager.del(`categories:${workspaceId}:all`);
    await this.cacheManager.del(`categories:${workspaceId}:${CategoryType.INCOME}`);
    await this.cacheManager.del(`categories:${workspaceId}:${CategoryType.EXPENSE}`);
  }
}
