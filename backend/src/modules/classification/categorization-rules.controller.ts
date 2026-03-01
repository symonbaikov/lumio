import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { ActorType, AuditAction, EntityType } from '../../entities/audit-event.entity';
import { CategorizationRule } from '../../entities/categorization-rule.entity';
import { Transaction } from '../../entities/transaction.entity';
import type { User } from '../../entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCategorizationRuleDto } from './dto/create-categorization-rule.dto';
import { TestCategorizationRuleDto } from './dto/test-categorization-rule.dto';
import { UpdateCategorizationRuleDto } from './dto/update-categorization-rule.dto';
import { ClassificationService } from './services/classification.service';

@Controller('categorization-rules')
@UseGuards(JwtAuthGuard)
export class CategorizationRulesController {
  constructor(
    @InjectRepository(CategorizationRule)
    private categorizationRuleRepository: Repository<CategorizationRule>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private classificationService: ClassificationService,
    private auditService: AuditService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_VIEW)
  async findAll(@CurrentUser() user: User, @WorkspaceId() workspaceId: string) {
    const rules = await this.categorizationRuleRepository.find({
      where: {
        userId: user.id,
        workspaceId,
      },
      order: {
        priority: 'DESC',
        createdAt: 'DESC',
      },
    });

    return {
      data: rules,
      total: rules.length,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_VIEW)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    const rule = await this.categorizationRuleRepository.findOne({
      where: {
        id,
        userId: user.id,
        workspaceId,
      },
    });

    if (!rule) {
      throw new Error('Categorization rule not found');
    }

    return rule;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_EDIT)
  async create(
    @Body() dto: CreateCategorizationRuleDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    const rule = this.categorizationRuleRepository.create({
      userId: user.id,
      workspaceId,
      name: dto.name,
      description: dto.description || null,
      conditions: dto.conditions,
      result: dto.result,
      priority: dto.priority || 0,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      matchCount: 0,
      lastMatchedAt: null,
    });

    await this.categorizationRuleRepository.save(rule);

    // Audit: record rule creation for audit trail.
    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: user.id,
      entityType: EntityType.RULE,
      entityId: rule.id,
      action: AuditAction.CREATE,
      diff: { before: null, after: rule },
    });

    return rule;
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_EDIT)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategorizationRuleDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    const rule = await this.categorizationRuleRepository.findOne({
      where: {
        id,
        userId: user.id,
        workspaceId,
      },
    });

    if (!rule) {
      throw new Error('Categorization rule not found');
    }

    const before = { ...rule };
    if (dto.name !== undefined) rule.name = dto.name;
    if (dto.description !== undefined) rule.description = dto.description;
    if (dto.conditions !== undefined) rule.conditions = dto.conditions;
    if (dto.result !== undefined) rule.result = dto.result;
    if (dto.priority !== undefined) rule.priority = dto.priority;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;

    await this.categorizationRuleRepository.save(rule);

    // Audit: record rule updates with before/after snapshots.
    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: user.id,
      entityType: EntityType.RULE,
      entityId: rule.id,
      action: AuditAction.UPDATE,
      diff: { before, after: rule },
      isUndoable: true,
    });

    return rule;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_DELETE)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    const rule = await this.categorizationRuleRepository.findOne({
      where: {
        id,
        userId: user.id,
        workspaceId,
      },
    });

    if (!rule) {
      throw new Error('Categorization rule not found');
    }

    await this.categorizationRuleRepository.remove(rule);

    // Audit: record rule deletion for rollback.
    await this.auditService.createEvent({
      workspaceId,
      actorType: ActorType.USER,
      actorId: user.id,
      entityType: EntityType.RULE,
      entityId: rule.id,
      action: AuditAction.DELETE,
      diff: { before: rule, after: null },
      isUndoable: true,
    });
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_VIEW)
  async testRule(
    @Body() dto: TestCategorizationRuleDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    const transactions = await this.transactionRepository.findByIds(dto.transactionIds);

    const matches = transactions.filter(transaction =>
      this.classificationService['matchesRule'](transaction, dto.conditions),
    );

    return {
      totalTransactions: transactions.length,
      matchedTransactions: matches.length,
      matches: matches.map(t => ({
        id: t.id,
        date: t.transactionDate,
        amount: t.debit || t.credit || t.amount,
        counterparty: t.counterpartyName,
        purpose: t.paymentPurpose,
        matchReason: this.getMatchReason(t, dto.conditions),
      })),
    };
  }

  private getMatchReason(transaction: Transaction, conditions: any[]): string {
    const matchedConditions: string[] = [];

    for (const condition of conditions) {
      const fieldValue = (transaction as any)[condition.field];
      if (!fieldValue) continue;

      let matches = false;
      const value = String(fieldValue).toLowerCase();
      const conditionValue = String(condition.value).toLowerCase();

      switch (condition.operator) {
        case 'contains':
          matches = value.includes(conditionValue);
          break;
        case 'equals':
          matches = value === conditionValue;
          break;
        case 'starts_with':
          matches = value.startsWith(conditionValue);
          break;
        case 'ends_with':
          matches = value.endsWith(conditionValue);
          break;
        case 'regex':
          matches = new RegExp(conditionValue, 'i').test(value);
          break;
        case 'greater_than':
          matches = Number(fieldValue) > Number(condition.value);
          break;
        case 'less_than':
          matches = Number(fieldValue) < Number(condition.value);
          break;
      }

      if (matches) {
        matchedConditions.push(`${condition.field} ${condition.operator} "${condition.value}"`);
      }
    }

    return matchedConditions.join(' AND ');
  }
}
