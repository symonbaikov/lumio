import {
  type DataEntry,
  type DataEntryCustomField,
  DataEntryType,
  type User,
  type WorkspaceMember,
} from '@/entities';
import { DataEntryService } from '@/modules/data-entry/data-entry.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IsNull, QueryFailedError } from 'typeorm';
import type { Repository } from 'typeorm';

function createRepoMock<T>() {
  return {
    findOne: jest.fn(),
    save: jest.fn(async (data: Partial<T>) => data as T),
    delete: jest.fn(async () => ({ affected: 1 })),
    create: jest.fn((data: Partial<T>) => data as T),
    createQueryBuilder: jest.fn(),
  } as unknown as Repository<T> & Record<string, any>;
}

function createQueryBuilderMock() {
  const qb: any = {
    where: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    leftJoin: jest.fn(() => qb),
    select: jest.fn(() => qb),
    addSelect: jest.fn(() => qb),
    groupBy: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    addOrderBy: jest.fn(() => qb),
    skip: jest.fn(() => qb),
    take: jest.fn(() => qb),
    getManyAndCount: jest.fn(async () => [[], 0]),
    getRawMany: jest.fn(async () => []),
  };
  return qb;
}

describe('DataEntryService', () => {
  const dataEntryRepository = createRepoMock<DataEntry>();
  const dataEntryCustomFieldRepository = createRepoMock<DataEntryCustomField>();
  const userRepository = createRepoMock<User>();
  const workspaceMemberRepository = createRepoMock<WorkspaceMember>();

  let service: DataEntryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DataEntryService(
      dataEntryRepository as any,
      dataEntryCustomFieldRepository as any,
      userRepository as any,
      workspaceMemberRepository as any,
      { resolve: jest.fn().mockResolvedValue('USD') } as any,
    );
  });

  it('create rejects customFieldValue without customFieldName', async () => {
    userRepository.findOne = jest.fn(async () => ({
      id: 'u1',
      workspaceId: null,
    }));

    await expect(
      service.create('ws-1', 'u1', {
        type: DataEntryType.CREDIT,
        date: '2025-01-01',
        amount: 1,
        customFieldValue: 'X',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('create rejects unknown customTabId', async () => {
    userRepository.findOne = jest.fn(async () => ({
      id: 'u1',
      workspaceId: null,
    }));
    dataEntryCustomFieldRepository.findOne = jest.fn(async () => null);

    await expect(
      service.create('ws-1', 'u1', {
        type: DataEntryType.DEBIT,
        date: '2025-01-01',
        amount: 1,
        customTabId: 'tab-1',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('list applies filters and escapes LIKE wildcards', async () => {
    const qb = createQueryBuilderMock();
    dataEntryRepository.createQueryBuilder = jest.fn(() => qb);
    qb.getManyAndCount = jest.fn(async () => [[{ id: 'e1' }], 1]);

    const result = await service.list({
      workspaceId: 'ws-1',
      type: DataEntryType.CREDIT,
      query: 'a%b_c',
      date: '2025-01-02',
      page: 2,
      limit: 10,
    });

    expect(qb.where).toHaveBeenCalledWith('"e"."workspace_id" = :workspaceId', {
      workspaceId: 'ws-1',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('"e"."custom_tab_id" IS NULL');
    expect(qb.andWhere).toHaveBeenCalledWith('"e"."type" = :type', {
      type: DataEntryType.CREDIT,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('"e"."date" = :date', {
      date: '2025-01-02',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('"e"."note" ILIKE :like', {
      like: '%a\\%b\\_c%',
    });
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(10);
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe('e1');
  });

  it('removeBaseTab adds type to hidden list and deletes matching entries', async () => {
    userRepository.findOne = jest.fn(async () => ({
      id: 'u1',
      dataEntryHiddenBaseTabs: [],
    }));
    userRepository.save = jest.fn(async (u: any) => u);

    await service.removeBaseTab('ws-1', 'u1', DataEntryType.CASH);

    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        dataEntryHiddenBaseTabs: [DataEntryType.CASH],
      }),
    );
    expect(dataEntryRepository.delete).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      type: DataEntryType.CASH,
      customTabId: IsNull(),
    });
  });

  it('createCustomField maps unique constraint violation to BadRequestException', async () => {
    userRepository.findOne = jest.fn(async () => ({
      id: 'u1',
      workspaceId: null,
    }));
    dataEntryCustomFieldRepository.save = jest.fn(async () => {
      throw new QueryFailedError('query', [], { code: '23505' } as any);
    });

    await expect(service.createCustomField('ws-1', 'u1', { name: 'Name' } as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('remove throws NotFoundException when entry does not exist', async () => {
    userRepository.findOne = jest.fn(async () => ({
      id: 'u1',
      workspaceId: null,
    }));
    dataEntryRepository.findOne = jest.fn(async () => null);

    await expect(service.remove('u1', 'missing')).rejects.toThrow(NotFoundException);
  });

  it('listCustomFields returns entriesCount as number', async () => {
    const qb = createQueryBuilderMock();
    dataEntryCustomFieldRepository.createQueryBuilder = jest.fn(() => qb);
    qb.getRawMany = jest.fn(async () => [{ id: 'f1', name: 'Tab', icon: null, entriesCount: '3' }]);

    const rows = await service.listCustomFields('ws-1');

    expect(rows).toHaveLength(1);
    expect(rows[0].entriesCount).toBe(3);
    expect(qb.where).toHaveBeenCalledWith('"f"."workspace_id" = :workspaceId', {
      workspaceId: 'ws-1',
    });
  });
});
