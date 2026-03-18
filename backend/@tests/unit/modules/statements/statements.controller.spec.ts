jest.mock('franc', () => ({
  franc: () => 'und',
}));

import { StatementStatus } from '@/entities/statement.entity';
import { StatementsController } from '@/modules/statements/statements.controller';

describe('StatementsController', () => {
  const statementsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    convertDroppedSampleToTransaction: jest.fn(),
  };

  const idempotencyService = {
    checkKey: jest.fn(),
    storeKey: jest.fn(),
  };

  const statementProcessingService = {
    processStatement: jest.fn(),
  };

  const controller = new StatementsController(
    statementsService as any,
    idempotencyService as any,
    statementProcessingService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    idempotencyService.checkKey.mockResolvedValue(null);
    idempotencyService.storeKey.mockResolvedValue(undefined);
  });

  it('returns uploaded statements immediately without waiting for parsing', async () => {
    const createdStatement = {
      id: 'stmt-1',
      status: StatementStatus.UPLOADED,
      parsingDetails: null,
    };

    statementsService.create.mockResolvedValue(createdStatement);
    statementProcessingService.processStatement.mockResolvedValue({
      ...createdStatement,
      status: StatementStatus.COMPLETED,
    });

    const file = {
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      path: '/tmp/test.pdf',
    };

    const result = await controller.upload(
      [file as Express.Multer.File],
      {} as any,
      { id: 'user-1' } as any,
      'ws-1',
    );

    expect(statementsService.create).toHaveBeenCalledTimes(1);
    expect(statementProcessingService.processStatement).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      cached: false,
      data: [
        {
          id: 'stmt-1',
          status: StatementStatus.UPLOADED,
        },
      ],
    });
  });

  it('passes categoryId to findAll and keeps items alias', async () => {
    statementsService.findAll.mockResolvedValue({
      data: [{ id: 'stmt-1' }],
      total: 1,
      page: 2,
      limit: 10,
    });

    const result = await controller.findAll(
      { id: 'user-1' } as any,
      'ws-1',
      '2',
      '10',
      'abc',
      'cat-1',
    );

    expect(statementsService.findAll).toHaveBeenCalledWith('ws-1', 2, 10, 'abc', 'cat-1');
    expect(result).toEqual({
      data: [{ id: 'stmt-1' }],
      items: [{ id: 'stmt-1' }],
      total: 1,
      page: 2,
      limit: 10,
    });
  });

  it('converts a dropped sample into a transaction', async () => {
    const response = {
      statement: { id: 'stmt-1' },
      transaction: { id: 'tx-1' },
    };

    statementsService.convertDroppedSampleToTransaction.mockResolvedValue(response);

    const result = await controller.convertDroppedSample(
      'stmt-1',
      {
        index: 0,
        transaction: {
          transactionDate: '2026-03-17',
          debit: 1250,
        },
      } as any,
      { id: 'user-1' } as any,
      'ws-1',
    );

    expect(statementsService.convertDroppedSampleToTransaction).toHaveBeenCalledWith(
      'stmt-1',
      'user-1',
      'ws-1',
      expect.objectContaining({
        index: 0,
        transaction: expect.objectContaining({ debit: 1250 }),
      }),
    );
    expect(result).toEqual(response);
  });
});
