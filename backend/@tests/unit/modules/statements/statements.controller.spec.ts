jest.mock('franc', () => ({
  franc: () => 'und',
}));

import { StatementStatus } from '@/entities/statement.entity';
import { StatementsController } from '@/modules/statements/statements.controller';

describe('StatementsController', () => {
  const statementsService = {
    create: jest.fn(),
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
});
