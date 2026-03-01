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
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { EntityType } from '../../entities/audit-event.entity';
import type { User } from '../../entities/user.entity';
import { Audit } from '../audit/decorators/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BulkUpdateTransactionDto } from './dto/bulk-update-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CrossStatementDeduplicationService } from './services/cross-statement-deduplication.service';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly deduplicationService: CrossStatementDeduplicationService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.TRANSACTION_VIEW)
  async findAll(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    // Accept both snake_case and camelCase for backward compatibility
    @Query('statement_id') statementIdSnake?: string,
    @Query('statementId') statementIdCamel?: string,
    @Query('date_from') dateFromSnake?: string,
    @Query('startDate') startDateCamel?: string,
    @Query('date_to') dateToSnake?: string,
    @Query('endDate') endDateCamel?: string,
    @Query('type') type?: string,
    @Query('category_id') categoryIdSnake?: string,
    @Query('categoryId') categoryIdCamel?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Prefer snake_case for backward compatibility, fall back to camelCase
    const statementId = statementIdSnake || statementIdCamel;
    const dateFrom = dateFromSnake || startDateCamel;
    const dateTo = dateToSnake || endDateCamel;
    const categoryId = categoryIdSnake || categoryIdCamel;

    const result = await this.transactionsService.findAll(workspaceId, {
      statementId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      type,
      categoryId,
      page: page ? Number.parseInt(page) : 1,
      limit: limit ? Number.parseInt(limit) : 50,
    });

    // Include 'items' field for backward compatibility
    return {
      ...result,
      items: result.data,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.TRANSACTION_VIEW)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.transactionsService.findOne(id, workspaceId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.TRANSACTION_EDIT)
  @Audit({ entityType: EntityType.TRANSACTION, includeDiff: true, isUndoable: true })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTransactionDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.transactionsService.update(id, workspaceId, user.id, updateDto);
  }

  @Post('bulk-update')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.TRANSACTION_BULK_UPDATE)
  async bulkUpdate(
    @Body() body: BulkUpdateTransactionDto | { ids: string[]; updates: any },
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    // Support both {items} and {ids, updates} formats for backward compatibility
    let items: Array<{ id: string; updates: any }>;

    if ('items' in body) {
      items = body.items;
    } else if ('ids' in body && 'updates' in body) {
      // Map {ids, updates} to items array
      items = body.ids.map(id => ({ id, updates: body.updates }));
    } else {
      throw new Error('Invalid bulk update format. Expected {items} or {ids, updates}');
    }

    return this.transactionsService.bulkUpdate(workspaceId, user.id, items);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.TRANSACTION_DELETE)
  @Audit({ entityType: EntityType.TRANSACTION, includeDiff: true, isUndoable: true })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    await this.transactionsService.remove(id, workspaceId, user.id);
  }

  @Get('duplicates/detect')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.TRANSACTION_VIEW)
  async detectDuplicates(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query('statement_id') statementId?: string,
    @Query('threshold') threshold?: string,
  ) {
    const duplicateGroups = await this.deduplicationService.findDuplicates(
      workspaceId,
      statementId,
      threshold ? Number.parseFloat(threshold) : 0.85,
    );

    return {
      totalGroups: duplicateGroups.length,
      groups: duplicateGroups.map(group => ({
        master: {
          id: group.master.id,
          date: group.master.transactionDate,
          amount: group.master.debit || group.master.credit || group.master.amount,
          counterparty: group.master.counterpartyName,
          purpose: group.master.paymentPurpose,
          statementId: group.master.statementId,
        },
        duplicates: group.duplicates.map(d => ({
          id: d.transaction.id,
          date: d.transaction.transactionDate,
          amount: d.transaction.debit || d.transaction.credit || d.transaction.amount,
          counterparty: d.transaction.counterpartyName,
          purpose: d.transaction.paymentPurpose,
          statementId: d.transaction.statementId,
          similarity: d.similarity,
          matchType: d.matchType,
          matchedFields: d.matchedFields,
        })),
        confidence: group.confidence,
      })),
    };
  }

  @Post('duplicates/mark')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.TRANSACTION_EDIT)
  async markDuplicates(
    @Body() body: { groups: Array<{ masterId: string; duplicateIds: string[] }> },
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    const duplicateGroups = await this.deduplicationService.findDuplicates(workspaceId);

    // Filter to only the groups specified by the client
    const groupsToMark = duplicateGroups.filter(group =>
      body.groups.some(g => g.masterId === group.master.id),
    );

    const markedCount = await this.deduplicationService.markDuplicates(groupsToMark);

    return {
      success: true,
      markedCount,
    };
  }

  @Post('duplicates/merge')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.TRANSACTION_EDIT)
  async mergeDuplicates(
    @Body() body: { transactionIds: string[] },
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    const master = await this.deduplicationService.mergeDuplicates(body.transactionIds);

    return {
      success: true,
      master: {
        id: master.id,
        date: master.transactionDate,
        amount: master.debit || master.credit || master.amount,
        counterparty: master.counterpartyName,
      },
    };
  }

  @Post(':id/unmark-duplicate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.TRANSACTION_EDIT)
  async unmarkDuplicate(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    const transaction = await this.deduplicationService.unmarkDuplicate(id);

    return {
      success: true,
      transaction: {
        id: transaction.id,
        isDuplicate: transaction.isDuplicate,
      },
    };
  }
}
