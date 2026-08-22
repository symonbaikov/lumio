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
});
