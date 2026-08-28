/// <reference types="jest" />

import { StatementStatus } from '@/entities/statement.entity';
import {
  MAX_PARSING_ATTEMPTS,
  StaleStatementReaper,
  StatementParsingProcessor,
} from '@/modules/parsing/queue/statement-parsing.processor';

describe('StatementParsingProcessor', () => {
  const statementRepository = {
    increment: jest.fn(async () => undefined),
    find: jest.fn(async () => []),
    update: jest.fn(async () => undefined),
  };
  const statementProcessingService = { processStatement: jest.fn(async () => undefined) };

  beforeEach(() => jest.clearAllMocks());

  const processor = () =>
    new StatementParsingProcessor(
      statementRepository as never,
      statementProcessingService as never,
    );

  it('counts the attempt before parsing so a crash still leaves a trace', async () => {
    await processor().process({ data: { statementId: 'stmt-1' }, attemptsMade: 0 } as never);

    expect(statementRepository.increment).toHaveBeenCalledWith(
      { id: 'stmt-1' },
      'parsingAttempts',
      1,
    );
    expect(statementProcessingService.processStatement).toHaveBeenCalledWith('stmt-1');
  });

  it('propagates failures so the queue retries with backoff', async () => {
    statementProcessingService.processStatement.mockRejectedValueOnce(new Error('parser blew up'));

    await expect(
      processor().process({ data: { statementId: 'stmt-1' }, attemptsMade: 1 } as never),
    ).rejects.toThrow('parser blew up');
  });
});

describe('StaleStatementReaper', () => {
  const statementRepository = {
    find: jest.fn(),
    update: jest.fn(async () => ({ affected: 1 })),
  };
  const queue = { enqueue: jest.fn(async () => undefined) };

  beforeEach(() => jest.clearAllMocks());

  const reaper = () => new StaleStatementReaper(statementRepository as never, queue as never);

  it('re-queues a statement stranded in PROCESSING', async () => {
    statementRepository.find.mockResolvedValueOnce([{ id: 'stmt-1', parsingAttempts: 1 }]);
    statementRepository.update.mockResolvedValueOnce({ affected: 1 });

    await reaper().reap();

    expect(statementRepository.update).toHaveBeenCalledWith(
      { id: 'stmt-1', status: StatementStatus.PROCESSING },
      { status: StatementStatus.UPLOADED },
    );
    expect(queue.enqueue).toHaveBeenCalledWith('stmt-1');
  });

  it('abandons a statement that has burned its attempts instead of looping', async () => {
    statementRepository.find.mockResolvedValueOnce([
      { id: 'stmt-poison', parsingAttempts: MAX_PARSING_ATTEMPTS },
    ]);

    await reaper().reap();

    expect(queue.enqueue).not.toHaveBeenCalled();
    expect(statementRepository.update).toHaveBeenCalledWith(
      { id: 'stmt-poison', status: StatementStatus.PROCESSING },
      expect.objectContaining({ status: StatementStatus.ERROR }),
    );
  });

  it('does nothing when no statement is stale', async () => {
    statementRepository.find.mockResolvedValueOnce([]);

    await reaper().reap();

    expect(statementRepository.update).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('does not re-queue (or clobber) a statement that already left PROCESSING by the time the conditional update runs', async () => {
    // Simulates the real race this guards against: the statement heartbeated
    // or finished between the reaper's SELECT and this UPDATE, so the
    // WHERE status = PROCESSING clause no longer matches.
    statementRepository.find.mockResolvedValueOnce([{ id: 'stmt-1', parsingAttempts: 1 }]);
    statementRepository.update.mockResolvedValueOnce({ affected: 0 });

    await reaper().reap();

    expect(statementRepository.update).toHaveBeenCalledWith(
      { id: 'stmt-1', status: StatementStatus.PROCESSING },
      { status: StatementStatus.UPLOADED },
    );
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
