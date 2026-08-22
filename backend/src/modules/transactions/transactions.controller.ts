import * as fs from 'node:fs';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { buildContentDisposition } from '../../common/utils/http-file.util';
import { deletedResponse } from '../../common/utils/responses.util';
import { EntityType } from '../../entities/audit-event.entity';
import type { User } from '../../entities/user.entity';
import { Audit } from '../audit/decorators/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { BulkUpdateItemDto } from './dto/bulk-update-transaction.dto';
import { BulkUpdateTransactionDto } from './dto/bulk-update-transaction.dto';
import { SetTransactionTagsDto } from './dto/set-transaction-tags.dto';
import { SplitTransactionDto } from './dto/split-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CrossStatementDeduplicationService } from './services/cross-statement-deduplication.service';
import { TransactionAttachmentsService } from './services/transaction-attachments.service';
import { TransactionTagsService } from './services/transaction-tags.service';
import { TransactionsService } from './transactions.service';

interface LegacyBulkUpdateTransactionDto {
  ids: string[];
  updates: UpdateTransactionDto;
}

/**
 * Aliased on purpose: writing `Express.Multer.File` straight into a decorated
 * parameter makes emitDecoratorMetadata emit a runtime reference to `Express`,
 * which does not exist and throws at import time.
 */
type MulterFile = Express.Multer.File;

/** Mirrors the 10 MB ceiling in validateFile, but rejects before the body is buffered. */
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly deduplicationService: CrossStatementDeduplicationService,
    private readonly transactionTagsService: TransactionTagsService,
    private readonly transactionAttachmentsService: TransactionAttachmentsService,
  ) {}

  @Get()
  @WorkspaceAuth(Permission.TRANSACTION_VIEW)
  async findAll(
    @CurrentUser() _user: User,
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
    @Query('currency') currency?: string,
    @Query('convert_to') convertTo?: string,
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
      currency,
      convertTo,
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
  @WorkspaceAuth(Permission.TRANSACTION_VIEW)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() _user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.transactionsService.findOne(id, workspaceId);
  }

  @Put(':id')
  @WorkspaceAuth(Permission.TRANSACTION_EDIT)
  @Audit({ entityType: EntityType.TRANSACTION, includeDiff: true, isUndoable: true })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTransactionDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.transactionsService.update(id, workspaceId, user.id, updateDto);
  }

  @Get(':id/split')
  @WorkspaceAuth(Permission.TRANSACTION_VIEW)
  async getSplitParts(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.transactionsService.getSplitParts(id, workspaceId);
  }

  // No @Audit here: TransactionsService.split writes its own richer audit event
  // (operation/splitGroupId/counts in meta). Stacking the decorator would double-log.
  @Post(':id/split')
  @HttpCode(HttpStatus.OK)
  @WorkspaceAuth(Permission.TRANSACTION_EDIT)
  async split(
    @Param('id') id: string,
    @Body() splitDto: SplitTransactionDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.transactionsService.split(id, workspaceId, user.id, splitDto);
  }

  // No @Audit here: see the note on split() above — unsplit audits itself too.
  @Post(':id/unsplit')
  @HttpCode(HttpStatus.OK)
  @WorkspaceAuth(Permission.TRANSACTION_EDIT)
  async unsplit(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.transactionsService.unsplit(id, workspaceId, user.id);
  }

  @Post('bulk-update')
  @HttpCode(HttpStatus.OK)
  @WorkspaceAuth(Permission.TRANSACTION_BULK_UPDATE)
  async bulkUpdate(
    @Body() body: BulkUpdateTransactionDto | LegacyBulkUpdateTransactionDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    // Support both {items} and {ids, updates} formats for backward compatibility
    let items: BulkUpdateItemDto[];

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
  @WorkspaceAuth(Permission.TRANSACTION_DELETE)
  @Audit({ entityType: EntityType.TRANSACTION, includeDiff: true, isUndoable: true })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    await this.transactionsService.remove(id, workspaceId, user.id);
  }

  @Get('duplicates/detect')
  @WorkspaceAuth(Permission.TRANSACTION_VIEW)
  async detectDuplicates(
    @CurrentUser() _user: User,
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
  @WorkspaceAuth(Permission.TRANSACTION_EDIT)
  async markDuplicates(
    @Body() body: { groups: Array<{ masterId: string; duplicateIds: string[] }> },
    @CurrentUser() _user: User,
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
  @WorkspaceAuth(Permission.TRANSACTION_EDIT)
  async mergeDuplicates(
    @Body() body: { transactionIds: string[] },
    @CurrentUser() _user: User,
    @WorkspaceId() _workspaceId: string,
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
  @WorkspaceAuth(Permission.TRANSACTION_EDIT)
  async unmarkDuplicate(
    @Param('id') id: string,
    @CurrentUser() _user: User,
    @WorkspaceId() _workspaceId: string,
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

  @Get(':id/tags')
  @WorkspaceAuth(Permission.TRANSACTION_VIEW)
  async getTags(@Param('id', new ParseUUIDPipe()) id: string, @WorkspaceId() workspaceId: string) {
    return this.transactionTagsService.getTags(id, workspaceId);
  }

  @Put(':id/tags')
  @WorkspaceAuth(Permission.TRANSACTION_EDIT)
  @Audit({ entityType: EntityType.TRANSACTION, includeDiff: true })
  async setTags(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetTransactionTagsDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.transactionTagsService.setTags(id, workspaceId, dto.tagIds);
  }

  @Get(':id/attachments')
  @WorkspaceAuth(Permission.TRANSACTION_VIEW)
  async listAttachments(
    @Param('id', new ParseUUIDPipe()) id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.transactionAttachmentsService.list(id, workspaceId);
  }

  @Post(':id/attachments')
  @WorkspaceAuth(Permission.TRANSACTION_EDIT)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_ATTACHMENT_BYTES } }))
  @Audit({ entityType: EntityType.TRANSACTION })
  async uploadAttachment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: MulterFile,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.transactionAttachmentsService.create(id, workspaceId, user.id, file);
  }

  @Get('attachments/:attachmentId/download')
  @WorkspaceAuth(Permission.TRANSACTION_VIEW)
  async downloadAttachment(
    @Param('attachmentId', new ParseUUIDPipe()) attachmentId: string,
    @WorkspaceId() workspaceId: string,
    @Res() res: Response,
  ) {
    const { absolutePath, fileName, mimeType } =
      await this.transactionAttachmentsService.getForDownload(attachmentId, workspaceId);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', buildContentDisposition('attachment', fileName));
    fs.createReadStream(absolutePath).pipe(res);
  }

  @Delete('attachments/:attachmentId')
  @WorkspaceAuth(Permission.TRANSACTION_EDIT)
  @Audit({ entityType: EntityType.TRANSACTION })
  async removeAttachment(
    @Param('attachmentId', new ParseUUIDPipe()) attachmentId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    await this.transactionAttachmentsService.remove(attachmentId, workspaceId);
    return deletedResponse('Attachment');
  }
}
