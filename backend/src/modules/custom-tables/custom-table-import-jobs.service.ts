import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  CustomTableImportJob,
  CustomTableImportJobStatus,
  CustomTableImportJobType,
} from '../../entities/custom-table-import-job.entity';
import type { GoogleSheetsImportCommitDto } from './dto/google-sheets-import-commit.dto';

type GoogleSheetsCommitJobPayload = GoogleSheetsImportCommitDto;
type ImportJobResult = Record<string, unknown>;
type JobProgressUpdate = {
  progress?: number;
  stage?: string | null;
  lockedAt: Date;
};
type JobCompletionUpdate = QueryDeepPartialEntity<CustomTableImportJob> & {
  status: CustomTableImportJobStatus;
  progress?: number;
  stage: string;
  result?: QueryDeepPartialEntity<Record<string, unknown>> | null;
  error: string | null;
  finishedAt: Date;
};

@Injectable()
export class CustomTableImportJobsService {
  private readonly logger = new Logger(CustomTableImportJobsService.name);

  constructor(
    @InjectRepository(CustomTableImportJob)
    private readonly jobRepository: Repository<CustomTableImportJob>,
  ) {}

  private toJobResultPatch(
    result: ImportJobResult,
  ): QueryDeepPartialEntity<Record<string, unknown>> {
    return result as QueryDeepPartialEntity<Record<string, unknown>>;
  }

  async createGoogleSheetsJob(
    userId: string,
    payload: GoogleSheetsCommitJobPayload,
  ): Promise<CustomTableImportJob> {
    const job = this.jobRepository.create({
      userId,
      type: CustomTableImportJobType.GOOGLE_SHEETS,
      status: CustomTableImportJobStatus.PENDING,
      progress: 0,
      stage: 'queued',
      payload: payload as unknown as Record<string, unknown>,
      result: null,
      error: null,
    });
    return this.jobRepository.save(job);
  }

  async createSheetTransactionsJob(
    userId: string,
    payload: Record<string, unknown>,
  ): Promise<CustomTableImportJob> {
    const job = this.jobRepository.create({
      userId,
      type: CustomTableImportJobType.SHEET_TRANSACTIONS,
      status: CustomTableImportJobStatus.PENDING,
      progress: 0,
      stage: 'queued',
      payload,
      result: null,
      error: null,
    });
    return this.jobRepository.save(job);
  }

  async getJobForUser(userId: string, jobId: string): Promise<CustomTableImportJob> {
    const job = await this.jobRepository.findOne({ where: { id: jobId, userId } });
    if (!job) {
      throw new NotFoundException('Job не найден');
    }
    return job;
  }

  async updateProgress(jobId: string, patch: { progress?: number; stage?: string | null }) {
    const update: JobProgressUpdate = {
      lockedAt: new Date(),
    };
    if (patch.progress !== undefined) {
      update.progress = patch.progress;
    }
    if (patch.stage !== undefined) {
      update.stage = patch.stage;
    }
    // Heartbeat for stale-lock recovery: keep locked_at fresh while the job is actively reporting progress.
    try {
      await this.jobRepository.update({ id: jobId }, update);
    } catch (_error) {
      this.logger.warn(`Failed to update job progress jobId=${jobId}`);
    }
  }

  async markDone(jobId: string, result: ImportJobResult) {
    const update: JobCompletionUpdate = {
      status: CustomTableImportJobStatus.DONE,
      progress: 100,
      stage: 'done',
      result: this.toJobResultPatch(result),
      error: null,
      finishedAt: new Date(),
    };
    await this.jobRepository.update({ id: jobId }, update);
  }

  async markFailed(jobId: string, error: string) {
    const update: JobCompletionUpdate = {
      status: CustomTableImportJobStatus.FAILED,
      stage: 'failed',
      error: error?.slice(0, 5000) || 'Unknown error',
      result: null,
      finishedAt: new Date(),
    };
    await this.jobRepository.update({ id: jobId }, update);
  }
}
