import { TransactionsController } from '@/modules/transactions/transactions.controller';

describe('TransactionsController', () => {
  it('parses query params in findAll', async () => {
    const transactionsService = {
      findAll: jest.fn(async () => ({ data: [], total: 0, page: 2, limit: 10 })),
      findOne: jest.fn(),
      update: jest.fn(),
      bulkUpdate: jest.fn(),
      remove: jest.fn(),
    };
    const controller = new TransactionsController(transactionsService as any, {} as any);

    const res = await controller.findAll(
      { id: 'u1' } as any,
      'ws-1',
      's1',
      undefined,
      '2025-01-01',
      undefined,
      '2025-01-31',
      'income',
      undefined,
      'cat1',
      '2',
      '10',
    );

    expect(res).toEqual({ data: [], items: [], total: 0, page: 2, limit: 10 });
    expect(transactionsService.findAll).toHaveBeenCalledWith('ws-1', {
      statementId: 's1',
      dateFrom: new Date('2025-01-01'),
      dateTo: new Date('2025-01-31'),
      type: 'income',
      categoryId: 'cat1',
      page: 2,
      limit: 10,
    });
  });

  it('bulkUpdate forwards items', async () => {
    const transactionsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      bulkUpdate: jest.fn(async () => [{ id: 't1' }]),
      remove: jest.fn(),
    };
    const controller = new TransactionsController(transactionsService as any, {} as any);
    const result = await controller.bulkUpdate(
      { items: [{ id: 't1', updates: { amount: 1 } }] } as any,
      { id: 'u1' } as any,
      'ws-1',
    );
    expect(result).toEqual([{ id: 't1' }]);
    expect(transactionsService.bulkUpdate).toHaveBeenCalledWith('ws-1', 'u1', [
      { id: 't1', updates: { amount: 1 } },
    ]);
  });
});
