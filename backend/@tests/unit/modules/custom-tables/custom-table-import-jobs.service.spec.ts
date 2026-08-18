import {
  type CustomTableImportJob,
  CustomTableImportJobStatus,
  CustomTableImportJobType,
} from '@/entities/custom-table-import-job.entity';
import { CustomTableImportJobsService } from '@/modules/custom-tables/custom-table-import-jobs.service';
import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

function createRepoMock<T>() {
  return {
    create: jest.fn((data: Partial<T>) => data as T),
    save: jest.fn(async (data: Partial<T>) => ({ id: 'job-1', ...data }) as any),
    findOne: jest.fn(),
    update: jest.fn(async () => ({ affected: 1 })),
  } as unknown as Repository<T> & Record<string, any>;
}

describe('CustomTableImportJobsService', () => {
  const jobRepository = createRepoMock<CustomTableImportJob>();
  let service: CustomTableImportJobsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CustomTableImportJobsService(jobRepository as any);
  });

  it('createGoogleSheetsJob creates a pending job', async () => {
    const job = await service.createGoogleSheetsJob('u1', { sheetId: 's1' });

    expect(job.type).toBe(CustomTableImportJobType.GOOGLE_SHEETS);
    expect(job.status).toBe(CustomTableImportJobStatus.PENDING);
    expect(job.progress).toBe(0);
    expect(job.payload).toEqual({ sheetId: 's1' });
  });

  it('createSheetTransactionsJob creates a pending job', async () => {
    const job = await service.createSheetTransactionsJob('u1', {
      workspaceId: 'w1',
      googleSheetId: 'gs1',
    });

    expect(job.type).toBe(CustomTableImportJobType.SHEET_TRANSACTIONS);
    expect(job.status).toBe(CustomTableImportJobStatus.PENDING);
    expect(job.progress).toBe(0);
    expect(job.payload).toEqual({ workspaceId: 'w1', googleSheetId: 'gs1' });
  });

  it('getJobForUser throws NotFoundException when missing', async () => {
    jobRepository.findOne = jest.fn(async () => null);
    await expect(service.getJobForUser('u1', 'missing')).rejects.toThrow(NotFoundException);
  });

  it('updateProgress updates lockedAt heartbeat', async () => {
    await service.updateProgress('job-1', { progress: 10, stage: 'fetch' });

    expect(jobRepository.update).toHaveBeenCalledWith(
      { id: 'job-1' },
      expect.objectContaining({
        progress: 10,
        stage: 'fetch',
        lockedAt: expect.any(Date),
      }),
    );
  });

  it('markDone sets DONE status and finishedAt', async () => {
    await service.markDone('job-1', { ok: true });

    expect(jobRepository.update).toHaveBeenCalledWith(
      { id: 'job-1' },
      expect.objectContaining({
        status: CustomTableImportJobStatus.DONE,
        progress: 100,
        stage: 'done',
        result: { ok: true },
        finishedAt: expect.any(Date),
      }),
    );
  });

  it('markFailed sets FAILED status and truncates error', async () => {
    await service.markFailed('job-1', 'x'.repeat(6000));

    expect(jobRepository.update).toHaveBeenCalledWith(
      { id: 'job-1' },
      expect.objectContaining({
        status: CustomTableImportJobStatus.FAILED,
        stage: 'failed',
        error: expect.any(String),
        finishedAt: expect.any(Date),
      }),
    );
    const payload = (jobRepository.update as any).mock.calls[0][1];
    expect(payload.error.length).toBeLessThanOrEqual(5000);
  });
});
