import { PERMISSIONS_KEY } from '@/common/decorators/require-permission.decorator';
import { Permission } from '@/common/enums/permissions.enum';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { SheetTransactionImportController } from '@/modules/import/sheet-transaction-import.controller';

describe('SheetTransactionImportController', () => {
  const user = { id: 'user-1' } as any;

  function buildController(overrides?: {
    sheetTransactionImportService?: Record<string, jest.Mock>;
    customTableImportJobsService?: Record<string, jest.Mock>;
  }) {
    const sheetTransactionImportService = {
      preview: jest.fn(async () => ({ sessionId: 'sess-1' })),
      commit: jest.fn(async () => ({ jobId: 'job-1' })),
      ...overrides?.sheetTransactionImportService,
    };
    const customTableImportJobsService = {
      getJobForUser: jest.fn(async () => ({
        id: 'job-1',
        type: 'SHEET_TRANSACTIONS',
        status: 'DONE',
        progress: 100,
        stage: 'done',
        result: null,
        error: null,
        createdAt: new Date('2026-01-01'),
        startedAt: new Date('2026-01-01'),
        finishedAt: new Date('2026-01-01'),
      })),
      ...overrides?.customTableImportJobsService,
    };
    const controller = new SheetTransactionImportController(
      sheetTransactionImportService as any,
      customTableImportJobsService as any,
    );
    return { controller, sheetTransactionImportService, customTableImportJobsService };
  }

  // These endpoints write a Statement and ledger Transactions. Without a
  // PermissionsGuard any workspace member — including a read-only one — could
  // import, so the wiring itself is asserted, not just the handler bodies.
  describe('authorization metadata', () => {
    const guardsOf = (handler: (...args: never[]) => unknown) =>
      (Reflect.getMetadata('__guards__', handler) ?? []) as unknown[];
    const permissionsOf = (handler: (...args: never[]) => unknown) =>
      (Reflect.getMetadata(PERMISSIONS_KEY, handler) ?? []) as Permission[];

    it.each([
      ['preview', SheetTransactionImportController.prototype.preview],
      ['commit', SheetTransactionImportController.prototype.commit],
    ])('gates %s behind PermissionsGuard with write permissions', (_name, handler) => {
      expect(guardsOf(handler)).toContain(PermissionsGuard);
      expect(permissionsOf(handler)).toEqual([
        Permission.STATEMENT_UPLOAD,
        Permission.TRANSACTION_EDIT,
      ]);
    });

    it('gates the job status endpoint behind a view permission', () => {
      const handler = SheetTransactionImportController.prototype.getJob;
      expect(guardsOf(handler)).toContain(PermissionsGuard);
      expect(permissionsOf(handler)).toEqual([Permission.STATEMENT_VIEW]);
    });
  });

  describe('preview', () => {
    it('calls the service with the decorator-supplied workspaceId, not a body-supplied one', async () => {
      const { controller, sheetTransactionImportService } = buildController();
      const dto = {
        defaultCurrency: 'USD',
        workspaceId: 'malicious-ws-id',
      } as any;

      const result = await controller.preview(user, 'ws-real', dto);

      expect(sheetTransactionImportService.preview).toHaveBeenCalledWith('ws-real', 'user-1', dto);
      expect(sheetTransactionImportService.preview.mock.calls[0][0]).not.toBe('malicious-ws-id');
      expect(result).toEqual({ sessionId: 'sess-1' });
    });
  });

  describe('commit', () => {
    it('calls the service with the decorator-supplied workspaceId and returns the jobId', async () => {
      const { controller, sheetTransactionImportService } = buildController();
      const dto = {
        defaultCurrency: 'USD',
        name: 'My import',
        workspaceId: 'malicious-ws-id',
      } as any;

      const result = await controller.commit(user, 'ws-real', dto);

      expect(sheetTransactionImportService.commit).toHaveBeenCalledWith('ws-real', 'user-1', dto);
      expect(sheetTransactionImportService.commit.mock.calls[0][0]).not.toBe('malicious-ws-id');
      expect(result).toEqual({ jobId: 'job-1' });
    });
  });

  describe('getJob', () => {
    it('calls getJobForUser with the authenticated userId, not workspaceId', async () => {
      const { controller, customTableImportJobsService } = buildController();

      const result = await controller.getJob(user, 'job-1');

      expect(customTableImportJobsService.getJobForUser).toHaveBeenCalledWith('user-1', 'job-1');
      expect(result).toEqual(
        expect.objectContaining({ id: 'job-1', status: 'DONE', progress: 100 }),
      );
    });
  });
});
