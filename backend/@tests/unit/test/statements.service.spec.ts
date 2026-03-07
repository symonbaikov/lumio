import * as fs from 'fs';
import { calculateFileHash } from '@/common/utils/file-hash.util';
import { StatementsService } from '@/modules/statements/statements.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

jest.mock('@/common/utils/file-hash.util', () => ({
  calculateFileHash: jest.fn(),
}));

describe('StatementsService', () => {
  const statementRepository = {
    create: jest.fn(data => data),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const auditService = { createEvent: jest.fn().mockResolvedValue(undefined) };
  const userRepository = {
    findOne: jest.fn(),
  };
  const workspaceMemberRepository = {
    findOne: jest.fn(),
  };
  const statementProcessingService = {
    processStatement: jest.fn().mockResolvedValue(undefined),
  };
  const fileStorageService = {};
  const transactionRepository = {};
  const categoryRepository = {};
  const taxRateRepository = {};
  const cacheManager = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
  const eventEmitter = { emit: jest.fn() };

  let service: StatementsService;
  let qb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(Buffer.from('test'));
    jest.spyOn(fs.promises, 'unlink').mockResolvedValue(undefined);

    qb = {
      leftJoinAndSelect: jest.fn(() => qb),
      orderBy: jest.fn(() => qb),
      skip: jest.fn(() => qb),
      take: jest.fn(() => qb),
      where: jest.fn(() => qb),
      andWhere: jest.fn(() => qb),
      getManyAndCount: jest.fn(async () => [[], 0]),
    };
    statementRepository.createQueryBuilder = jest.fn(() => qb);

    service = new StatementsService(
      statementRepository as any,
      transactionRepository as any,
      userRepository as any,
      categoryRepository as any,
      taxRateRepository as any,
      workspaceMemberRepository as any,
      fileStorageService as any,
      statementProcessingService as any,
      cacheManager as any,
      auditService as any,
      eventEmitter as any,
    );
    jest.spyOn(service as any, 'ensureCanEditStatements').mockResolvedValue(undefined);
  });

  it('orders by createdAt when listing statements', async () => {
    qb.getManyAndCount = jest.fn(async () => [[], 0]);

    const result = await service.findAll('ws-1', 1, 20);

    expect(statementRepository.createQueryBuilder).toHaveBeenCalledWith('statement');
    expect(qb.orderBy).toHaveBeenCalledWith('statement.createdAt', 'DESC');
    expect(qb.where).toHaveBeenCalledWith('statement.deletedAt IS NULL');
    expect(qb.andWhere).toHaveBeenCalledWith('statement.workspaceId = :workspaceId', {
      workspaceId: 'ws-1',
    });
    expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
  });

  it('filters by workspace when user is in workspace', async () => {
    qb.getManyAndCount = jest.fn(async () => [[], 0]);

    await service.findAll('ws-1', 1, 20);

    expect(qb.where).toHaveBeenCalledWith('statement.deletedAt IS NULL');
    expect(qb.andWhere).toHaveBeenCalledWith('statement.workspaceId = :workspaceId', {
      workspaceId: 'ws-1',
    });
  });

  it('creates a new statement even when file hash is duplicated', async () => {
    (calculateFileHash as jest.Mock).mockResolvedValue('same-hash');
    statementRepository.save
      .mockImplementationOnce(async entity => ({ ...entity, id: 'stmt-1' }))
      .mockImplementationOnce(async entity => ({ ...entity, id: 'stmt-2' }));
    statementRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'stmt-1' });

    statementRepository.createQueryBuilder = jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }));

    const file = {
      path: '/tmp/file-1.pdf',
      originalname: 'file.pdf',
      mimetype: 'application/pdf',
      size: 123,
    } as any;

    const user = { id: 'user-1' } as any;
    await service.create(user, 'ws-1', file);
    await expect(service.create(user, 'ws-1', file)).rejects.toThrow();
  });
});
