import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import {
  CustomTableImportJob,
  CustomTableImportJobStatus,
  CustomTableImportJobType,
} from '../../entities/custom-table-import-job.entity';
import type { SheetTransactionCommitInput } from '../import/services/sheet-transaction-import.service';
import { SheetTransactionImportService } from '../import/services/sheet-transaction-import.service';
import { CustomTableImportJobsService } from './custom-table-import-jobs.service';
import { CustomTablesImportService } from './custom-tables-import.service';
import type { GoogleSheetsImportCommitDto } from './dto/google-sheets-import-commit.dto';

type GoogleSheetsCommitJobPayload = GoogleSheetsImportCommitDto;
type SheetTransactionsJobPayload = SheetTransactionCommitInput & { workspaceId: string };
type JobUnlockUpdate = { lockedAt: null; lockedBy: null };

@Injectable()
export class CustomTableImportJobsProcessor {
  private readonly logger = new Logger(CustomTableImportJobsProcessor.name);
  private readonly instanceId =
    process.env.RAILWAY_SERVICE_INSTANCE_ID || process.env.HOSTNAME || randomUUID();
  private running = false;
  private readonly staleLockMs = Number(
    process.env.CUSTOM_TABLE_IMPORT_JOB_STALE_LOCK_MS || 10 * 60 * 1000,
  );

  constructor(
    @InjectRepository(CustomTableImportJob)
    private readonly jobRepository: Repository<CustomTableImportJob>,
    private readonly importService: CustomTablesImportService,
    private readonly jobsService: CustomTableImportJobsService,
    @Inject(forwardRef(() => SheetTransactionImportService))
    private readonly sheetTransactionImportService: SheetTransactionImportService,
  ) {}

  private toRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  @Interval(2000)
  async tick() {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const job = await this.claimNextJob();
      if (!job) {
        return;
      }
      await this.processJob(job);
    } catch (error) {
      this.logger.warn(
        `Job tick failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    } finally {
      this.running = false;
    }
  }

  private extractJobId(raw: unknown): string | null {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const stack: unknown[] = [raw];
    const seen = new Set<unknown>();
    let steps = 0;

    while (stack.length && steps < 200) {
      steps += 1;
      const current = stack.pop();
      if (current === null || current === undefined) {
        continue;
      }
      if (seen.has(current)) {
        continue;
      }
      seen.add(current);

      if (typeof current === 'string') {
        if (uuidRe.test(current)) {
          return current;
        }
        continue;
      }

      if (Array.isArray(current)) {
        for (let i = current.length - 1; i >= 0; i -= 1) {
          stack.push(current[i]);
        }
        continue;
      }

      if (typeof current === 'object') {
        const obj = this.toRecord(current);
        if (!obj) {
          continue;
        }

        const directId = obj.id;
        if (typeof directId === 'string' && uuidRe.test(directId)) {
          return directId;
        }

        const maybeRows = obj.rows;
        if (Array.isArray(maybeRows)) {
          stack.push(maybeRows);
        }

        for (const value of Object.values(obj)) {
          stack.push(value);
        }
      }
    }

    return null;
  }

  private async claimNextJob(): Promise<CustomTableImportJob | null> {
    const staleBefore = new Date(
      Date.now() - (Number.isFinite(this.staleLockMs) ? this.staleLockMs : 10 * 60 * 1000),
    );
    const rows = await this.jobRepository.query(
      `
      WITH next_job AS (
        SELECT id
        FROM custom_table_import_jobs
        WHERE
          (status = 'pending' AND type IS NOT NULL)
          OR (status = 'running' AND locked_by = $1 AND type IS NOT NULL)
          OR (status = 'running' AND locked_at IS NOT NULL AND locked_at < $2 AND type IS NOT NULL)
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE custom_table_import_jobs j
      SET status = 'running',
          locked_at = now(),
          locked_by = $1,
          started_at = COALESCE(started_at, now()),
          stage = 'running'
      FROM next_job
      WHERE j.id = next_job.id
      RETURNING
        j.id as id
      `,
      [this.instanceId, staleBefore],
    );

    const id = this.extractJobId(rows);
    if (!id) {
      // Only log warning if we actually got data back but couldn't extract ID
      // Empty arrays like [[],[]] mean no jobs were found, which is normal
      const hasData =
        Array.isArray(rows) &&
        rows.length > 0 &&
        rows.some(row => (Array.isArray(row) ? row.length > 0 : row));

      if (hasData) {
        const preview = (() => {
          try {
            return JSON.stringify(rows);
          } catch {
            return String(rows);
          }
        })();
        this.logger.warn(`Claimed job row without id (raw=${preview})`);
      }
      return null;
    }

    const job = await this.jobRepository.findOne({ where: { id } });
    if (!job) {
      this.logger.warn(`Claimed job id=${id} but cannot load it`);
      return null;
    }
    return job;
  }

  private async processJob(job: CustomTableImportJob) {
    this.logger.log(`Processing job ${job.id} type=${job.type}`);
    try {
      if (job.type === CustomTableImportJobType.GOOGLE_SHEETS) {
        const dto = job.payload as unknown as GoogleSheetsCommitJobPayload;
        // Легаси-строки (до появления workspace_id) хранили workspaceId в user_id.
        const workspaceId = job.workspaceId ?? job.userId;
        const result = await this.importService.executeGoogleSheetsCommit(workspaceId, dto, {
          onProgress: async (progress, stage) => {
            await this.jobsService.updateProgress(job.id, { progress, stage });
          },
        });
        await this.jobsService.markDone(job.id, result);
        return;
      }
      if (job.type === CustomTableImportJobType.SHEET_TRANSACTIONS) {
        const { workspaceId, ...dto } = job.payload as unknown as SheetTransactionsJobPayload;
        const result = await this.sheetTransactionImportService.runCommit(
          workspaceId,
          job.userId,
          dto,
        );
        await this.jobsService.markDone(job.id, result as unknown as Record<string, unknown>);
        return;
      }
      throw new Error(`Unsupported job type: ${job.type}`);
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.error(`Job ${job.id} failed: ${message}`);
      await this.jobsService.markFailed(job.id, message);
    } finally {
      const update: JobUnlockUpdate = {
        lockedAt: null,
        lockedBy: null,
      };
      await this.jobRepository.update(
        { id: job.id, status: CustomTableImportJobStatus.RUNNING },
        update,
      );
    }
  }
}
