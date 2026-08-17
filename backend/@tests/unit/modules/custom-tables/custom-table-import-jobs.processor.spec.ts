import {
  type CustomTableImportJob,
  CustomTableImportJobStatus,
  CustomTableImportJobType,
} from '@/entities/custom-table-import-job.entity';
import { CustomTableImportJobsProcessor } from '@/modules/custom-tables/custom-table-import-jobs.processor';
import type { CustomTableImportJobsService } from '@/modules/custom-tables/custom-table-import-jobs.service';
import type { CustomTablesImportService } from '@/modules/custom-tables/custom-tables-import.service';
import type { SheetTransactionImportService } from '@/modules/import/services/sheet-transaction-import.service';
import type { Repository } from 'typeorm';

function createJobRepoMock() {
  return {
    update: jest.fn(async () => ({ affected: 1 })),
  } as unknown as Repository<CustomTableImportJob> & Record<string, any>;
}

describe('CustomTableImportJobsProcessor', () => {
  let jobRepository: ReturnType<typeof createJobRepoMock>;
  let importService: CustomTablesImportService;
  let jobsService: CustomTableImportJobsService;
  let sheetTransactionImportService: SheetTransactionImportService;
  let processor: CustomTableImportJobsProcessor;

  const baseJob = {
    id: 'job-1',
    userId: 'user-1',
    status: CustomTableImportJobStatus.RUNNING,
  } as CustomTableImportJob;

  beforeEach(() => {
    jobRepository = createJobRepoMock();
    importService = {
      executeGoogleSheetsCommit: jest.fn(),
    } as unknown as CustomTablesImportService;
    jobsService = {
      updateProgress: jest.fn(),
      markDone: jest.fn(),
      markFailed: jest.fn(),
    } as unknown as CustomTableImportJobsService;
    sheetTransactionImportService = {
      runCommit: jest.fn(),
    } as unknown as SheetTransactionImportService;

    processor = new CustomTableImportJobsProcessor(
      jobRepository as any,
      importService,
      jobsService,
      sheetTransactionImportService,
    );
  });

  describe('SHEET_TRANSACTIONS job type', () => {
    it('calls runCommit with workspaceId extracted from payload and stripped from dto', async () => {
      const dto = { googleSheetId: 'gs1', defaultCurrency: 'USD', name: 'Sheet import' };
      const job = {
        ...baseJob,
        type: CustomTableImportJobType.SHEET_TRANSACTIONS,
        payload: { ...dto, workspaceId: 'ws-1' },
      } as CustomTableImportJob;

      (sheetTransactionImportService.runCommit as jest.Mock).mockResolvedValue({
        statementId: 'stmt-1',
        imported: 3,
        skipped: 0,
        duplicates: 0,
        warnings: [],
      });

      await (processor as any).processJob(job);

      expect(sheetTransactionImportService.runCommit).toHaveBeenCalledWith(
        'ws-1',
        'user-1',
        dto,
      );
      const callArgs = (sheetTransactionImportService.runCommit as jest.Mock).mock.calls[0];
      expect(callArgs[2]).not.toHaveProperty('workspaceId');
    });

    it('marks the job done with the runCommit result on success', async () => {
      const job = {
        ...baseJob,
        type: CustomTableImportJobType.SHEET_TRANSACTIONS,
        payload: { workspaceId: 'ws-1', googleSheetId: 'gs1', defaultCurrency: 'USD', name: 'x' },
      } as CustomTableImportJob;
      const result = { statementId: 'stmt-1', imported: 1, skipped: 0, duplicates: 0, warnings: [] };
      (sheetTransactionImportService.runCommit as jest.Mock).mockResolvedValue(result);

      await (processor as any).processJob(job);

      expect(jobsService.markDone).toHaveBeenCalledWith('job-1', result);
      expect(jobsService.markFailed).not.toHaveBeenCalled();
    });

    it('marks the job failed with the error message when runCommit throws', async () => {
      const job = {
        ...baseJob,
        type: CustomTableImportJobType.SHEET_TRANSACTIONS,
        payload: { workspaceId: 'ws-1', googleSheetId: 'gs1', defaultCurrency: 'USD', name: 'x' },
      } as CustomTableImportJob;
      (sheetTransactionImportService.runCommit as jest.Mock).mockRejectedValue(
        new Error('boom'),
      );

      await (processor as any).processJob(job);

      expect(jobsService.markFailed).toHaveBeenCalledWith('job-1', 'boom');
      expect(jobsService.markDone).not.toHaveBeenCalled();
    });

    it('unlocks the job row in the finally block on both success and failure', async () => {
      const job = {
        ...baseJob,
        type: CustomTableImportJobType.SHEET_TRANSACTIONS,
        payload: { workspaceId: 'ws-1', googleSheetId: 'gs1', defaultCurrency: 'USD', name: 'x' },
      } as CustomTableImportJob;
      (sheetTransactionImportService.runCommit as jest.Mock).mockRejectedValue(
        new Error('boom'),
      );

      await (processor as any).processJob(job);

      expect(jobRepository.update).toHaveBeenCalledWith(
        { id: 'job-1', status: CustomTableImportJobStatus.RUNNING },
        { lockedAt: null, lockedBy: null },
      );
    });
  });
});
