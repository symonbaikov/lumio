import { NotFoundException } from '@nestjs/common';
import { PayableDirection } from '@/entities/payable.entity';
import { SearchService } from '@/modules/search/search.service';

const createQueryBuilderMock = (rows: unknown[]) => ({
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(rows),
});

const createFavoritesServiceMocks = (rows: unknown[] = []) => {
  const builder = createQueryBuilderMock(rows);
  const insertBuilder = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
  };
  const statementRepo = {
    createQueryBuilder: jest.fn(() => builder),
    exists: jest.fn().mockResolvedValue(true),
  } as any;
  const favoriteRepo = {
    createQueryBuilder: jest.fn(() => insertBuilder),
    delete: jest.fn().mockResolvedValue(undefined),
  } as any;
  const service = new SearchService(
    createRepoMock(),
    statementRepo,
    createRepoMock(),
    createRepoMock(),
    favoriteRepo,
  );
  return { service, builder, insertBuilder, statementRepo, favoriteRepo };
};

const createRepoMock = (rows: unknown[] = []) =>
  ({
    createQueryBuilder: jest.fn(() => createQueryBuilderMock(rows)),
  }) as any;

describe('SearchService', () => {
  it('ignores queries shorter than two characters without touching the database', async () => {
    const transactionRepo = createRepoMock();
    const service = new SearchService(
      transactionRepo,
      createRepoMock(),
      createRepoMock(),
      createRepoMock(),
      createRepoMock(),
    );

    const result = await service.search('ws-1', ' a ');

    expect(result.results).toEqual([]);
    expect(transactionRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('labels receivables separately from payables and routes them to their own page', async () => {
    const payableRepo = createRepoMock([
      { id: 'p-1', vendor: 'Owes Us Ltd', comment: null, direction: PayableDirection.RECEIVABLE },
      { id: 'p-2', vendor: 'We Owe Ltd', comment: null, direction: PayableDirection.PAYABLE },
    ]);
    const service = new SearchService(
      createRepoMock(),
      createRepoMock(),
      payableRepo,
      createRepoMock(),
      createRepoMock(),
    );

    const result = await service.search('ws-1', 'ltd');

    expect(result.results).toEqual([
      {
        kind: 'receivable',
        id: 'p-1',
        title: 'Owes Us Ltd',
        subtitle: null,
        href: '/statements/receive',
      },
      {
        kind: 'payable',
        id: 'p-2',
        title: 'We Owe Ltd',
        subtitle: null,
        href: '/statements/pay',
      },
    ]);
  });

  it('returns the five latest uploads of the workspace, newest first', async () => {
    const builder = createQueryBuilderMock([
      { id: 's-1', fileName: 'receipt-scan.jpg', bankName: null },
      { id: 's-2', fileName: 'march.pdf', bankName: 'Kaspi' },
    ]);
    const statementRepo = { createQueryBuilder: jest.fn(() => builder) } as any;
    const transactionRepo = createRepoMock();
    const service = new SearchService(
      transactionRepo,
      statementRepo,
      createRepoMock(),
      createRepoMock(),
      createRepoMock(),
    );

    const result = await service.recent('ws-1');

    expect(builder.where).toHaveBeenCalledWith('s.workspaceId = :workspaceId', {
      workspaceId: 'ws-1',
    });
    expect(builder.andWhere).toHaveBeenCalledWith('s.deletedAt IS NULL');
    expect(builder.orderBy).toHaveBeenCalledWith('s.createdAt', 'DESC');
    expect(builder.take).toHaveBeenCalledWith(5);
    expect(transactionRepo.createQueryBuilder).not.toHaveBeenCalled();
    expect(result).toEqual({
      query: '',
      results: [
        {
          kind: 'statement',
          id: 's-1',
          title: 'receipt-scan.jpg',
          subtitle: null,
          href: '/statements/s-1/view',
        },
        {
          kind: 'statement',
          id: 's-2',
          title: 'march.pdf',
          subtitle: 'Kaspi',
          href: '/statements/s-2/view',
        },
      ],
    });
  });

  it('lists only the caller\'s starred statements in this workspace, latest star first', async () => {
    const { service, builder } = createFavoritesServiceMocks([
      { id: 's-9', fileName: 'kept.pdf', bankName: null },
    ]);

    const result = await service.favorites('ws-1', 'user-1');

    expect(builder.innerJoin).toHaveBeenCalledWith(
      expect.anything(),
      'f',
      'f.statementId = s.id AND f.userId = :userId',
      { userId: 'user-1' },
    );
    expect(builder.where).toHaveBeenCalledWith('s.workspaceId = :workspaceId', {
      workspaceId: 'ws-1',
    });
    expect(builder.andWhere).toHaveBeenCalledWith('s.deletedAt IS NULL');
    expect(builder.orderBy).toHaveBeenCalledWith('f.createdAt', 'DESC');
    expect(result.results).toEqual([
      { kind: 'statement', id: 's-9', title: 'kept.pdf', subtitle: null, href: '/statements/s-9/view' },
    ]);
  });

  it('refuses to star a statement outside the workspace and writes nothing', async () => {
    const { service, statementRepo, favoriteRepo } = createFavoritesServiceMocks();
    statementRepo.exists.mockResolvedValue(false);

    await expect(service.addFavorite('ws-1', 'user-1', 's-other')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(statementRepo.exists).toHaveBeenCalledWith({
      where: { id: 's-other', workspaceId: 'ws-1', deletedAt: expect.anything() },
    });
    expect(favoriteRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('stars idempotently, ignoring a star that already exists', async () => {
    const { service, insertBuilder } = createFavoritesServiceMocks();

    await service.addFavorite('ws-1', 'user-1', 's-1');

    expect(insertBuilder.values).toHaveBeenCalledWith({ userId: 'user-1', statementId: 's-1' });
    expect(insertBuilder.orIgnore).toHaveBeenCalled();
    expect(insertBuilder.execute).toHaveBeenCalled();
  });

  it('unstars only the caller\'s own row', async () => {
    const { service, favoriteRepo } = createFavoritesServiceMocks();

    await service.removeFavorite('user-1', 's-1');

    expect(favoriteRepo.delete).toHaveBeenCalledWith({ userId: 'user-1', statementId: 's-1' });
  });
});
