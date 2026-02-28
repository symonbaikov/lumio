import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import {
  AuditAction,
  AuditEvent,
  type AuditEventDiff,
  EntityType,
} from '../../../entities/audit-event.entity';
import { Category } from '../../../entities/category.entity';
import { CustomTableRow } from '../../../entities/custom-table-row.entity';
import { Statement } from '../../../entities/statement.entity';
import { Transaction } from '../../../entities/transaction.entity';
import type { RollbackResult } from '../interfaces/audit-event.interface';

@Injectable()
export class RollbackService {
  private readonly logger = new Logger(RollbackService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Statement)
    private readonly statementRepository: Repository<Statement>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(CustomTableRow)
    private readonly customTableRowRepository: Repository<CustomTableRow>,
  ) {}

  async rollback(event: AuditEvent): Promise<RollbackResult> {
    switch (event.entityType) {
      case EntityType.TRANSACTION:
        return this.rollbackTransaction(event);
      case EntityType.STATEMENT:
        return this.rollbackStatement(event);
      case EntityType.CATEGORY:
        return this.rollbackCategory(event);
      case EntityType.TABLE_ROW:
        return this.rollbackCustomTableRow(event);
      case EntityType.TABLE_CELL:
        return this.rollbackCustomTableCell(event);
      default:
        return {
          success: false,
          message: `Rollback not supported for entity type ${event.entityType}`,
        };
    }
  }

  async rollbackTransaction(event: AuditEvent): Promise<RollbackResult> {
    return this.applyRollback(event, this.transactionRepository);
  }

  async rollbackStatement(event: AuditEvent): Promise<RollbackResult> {
    return this.applyRollback(event, this.statementRepository);
  }

  async rollbackCategory(event: AuditEvent): Promise<RollbackResult> {
    return this.applyRollback(event, this.categoryRepository);
  }

  async rollbackCustomTableRow(event: AuditEvent): Promise<RollbackResult> {
    return this.applyRollback(event, this.customTableRowRepository);
  }

  async rollbackCustomTableCell(event: AuditEvent): Promise<RollbackResult> {
    if (event.action !== AuditAction.UPDATE) {
      return { success: false, message: `Rollback not supported for action ${event.action}` };
    }

    const columnKey = event.meta?.cell?.column;
    if (!columnKey) {
      return { success: false, message: 'Missing cell column for rollback' };
    }

    const snapshot = this.extractSnapshots(event.diff);
    if (!snapshot?.before) {
      return { success: false, message: 'Missing before state for rollback' };
    }

    try {
      const row = await this.customTableRowRepository.findOne({ where: { id: event.entityId } });
      if (!row) {
        return { success: false, message: 'Row not found for rollback' };
      }
      const data = { ...(row.data || {}) } as Record<string, any>;
      data[columnKey] = (snapshot.before as Record<string, any>)?.value ?? null;
      await this.customTableRowRepository.update(event.entityId, { data } as any);
      return { success: true, message: 'Cell update rolled back' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Rollback failed: ${message}`);
      return { success: false, message };
    }
  }

  private async applyRollback<T extends { id: string }>(
    event: AuditEvent,
    repository: Repository<T>,
  ): Promise<RollbackResult> {
    // Safety: rollback only proceeds when a before snapshot exists.
    const snapshot = this.extractSnapshots(event.diff);

    try {
      switch (event.action) {
        case AuditAction.UPDATE: {
          if (!snapshot?.before) {
            return { success: false, message: 'Missing before state for rollback' };
          }
          await repository.update(event.entityId, snapshot.before as any);
          return { success: true, message: 'Update rolled back' };
        }
        case AuditAction.DELETE: {
          if (!snapshot?.before) {
            return { success: false, message: 'Missing before state for rollback' };
          }
          let restored = repository.create(snapshot.before as any);
          if (event.entityType === EntityType.STATEMENT && 'deletedAt' in restored) {
            const { deletedAt: _deletedAt, ...rest } = restored as Record<string, any>;
            restored = rest as typeof restored;
          }
          await repository.save(restored);
          return { success: true, message: 'Delete rolled back' };
        }
        case AuditAction.CREATE: {
          await repository.delete(event.entityId as any);
          return { success: true, message: 'Create rolled back' };
        }
        default:
          return { success: false, message: `Rollback not supported for action ${event.action}` };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Rollback failed: ${message}`);
      return { success: false, message };
    }
  }

  private extractSnapshots(
    diff: AuditEventDiff | null | undefined,
  ): { before: Record<string, any> | null; after: Record<string, any> | null } | null {
    if (!diff || Array.isArray(diff)) {
      return null;
    }

    return {
      before: diff.before ? (diff.before as Record<string, any>) : null,
      after: diff.after ? (diff.after as Record<string, any>) : null,
    };
  }
}
