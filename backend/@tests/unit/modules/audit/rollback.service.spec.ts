import { AuditAction, type AuditEvent, EntityType } from '@/entities/audit-event.entity';
import { Category } from '@/entities/category.entity';
import { CustomTableRow } from '@/entities/custom-table-row.entity';
import { Statement } from '@/entities/statement.entity';
import { Transaction } from '@/entities/transaction.entity';
import { RollbackService } from '@/modules/audit/rollback/rollback.service';
import type { Repository } from 'typeorm';

function createRepoMock<T>() {
  return {
    update: jest.fn(async () => ({ affected: 1 })),
    delete: jest.fn(async () => ({ affected: 1 })),
    create: jest.fn((data: Partial<T>) => data as T),
    save: jest.fn(async (data: Partial<T>) => data as T),
  } as unknown as Repository<T> & Record<string, any>;
}

describe('RollbackService', () => {
  const transactionRepository = createRepoMock<Transaction>();
  const statementRepository = createRepoMock<Statement>();
  const categoryRepository = createRepoMock<Category>();
  const customTableRowRepository = createRepoMock<CustomTableRow>();

  let service: RollbackService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RollbackService(
      transactionRepository as any,
      statementRepository as any,
      categoryRepository as any,
      customTableRowRepository as any,
    );
  });

  it('rolls back transaction updates using before snapshot', async () => {
    const event: AuditEvent = {
      id: 'evt-1',
      entityId: 't1',
      entityType: EntityType.TRANSACTION,
      action: AuditAction.UPDATE,
      diff: { before: { amount: 10 }, after: { amount: 20 } },
    } as AuditEvent;

    const result = await service.rollback(event);

    expect(transactionRepository.update).toHaveBeenCalledWith('t1', { amount: 10 });
    expect(result.success).toBe(true);
  });

  it('rolls back statement delete by recreating entity', async () => {
    const event: AuditEvent = {
      id: 'evt-2',
      entityId: 's1',
      entityType: EntityType.STATEMENT,
      action: AuditAction.DELETE,
      diff: { before: { id: 's1', name: 'Stmt' }, after: null },
    } as AuditEvent;

    const result = await service.rollback(event);

    expect(statementRepository.create).toHaveBeenCalledWith({ id: 's1', name: 'Stmt' });
    expect(statementRepository.save).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('rolls back category create by deleting entity', async () => {
    const event: AuditEvent = {
      id: 'evt-3',
      entityId: 'c1',
      entityType: EntityType.CATEGORY,
      action: AuditAction.CREATE,
      diff: { before: null, after: { id: 'c1', name: 'Cat' } },
    } as AuditEvent;

    const result = await service.rollback(event);

    expect(categoryRepository.delete).toHaveBeenCalledWith('c1');
    expect(result.success).toBe(true);
  });
});
