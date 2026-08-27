import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

export const STATEMENT_PARSING_QUEUE = 'statement-parsing';

export interface StatementParsingJob {
  statementId: string;
}

/**
 * Entry point for statement processing.
 *
 * Uploads used to call `processStatement()` fire-and-forget, so a restart mid-parse
 * lost the work with no retry and no record. The queue gives durability and
 * retries; `jobId = statementId` gives cross-instance deduplication, which the
 * previous in-process Map and Semaphore could not do.
 */
@Injectable()
export class StatementParsingQueue {
  private readonly logger = new Logger(StatementParsingQueue.name);

  constructor(
    @InjectQueue(STATEMENT_PARSING_QUEUE)
    private readonly queue: Queue<StatementParsingJob>,
  ) {}

  /**
   * Enqueues a statement for parsing. Safe to call repeatedly: while a job for
   * this statement is waiting or active, BullMQ ignores the duplicate id.
   */
  async enqueue(statementId: string): Promise<void> {
    try {
      await this.queue.add(
        'parse',
        { statementId },
        {
          jobId: statementId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: true,
          // Kept so a permanently failed statement stays inspectable.
          removeOnFail: 500,
        },
      );
    } catch (error) {
      // Redis being down must not lose the upload: the statement is already
      // persisted as UPLOADED and the reaper below will pick it up.
      this.logger.error(
        `Failed to enqueue statement ${statementId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
