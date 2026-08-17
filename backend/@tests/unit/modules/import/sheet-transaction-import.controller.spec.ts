import { PERMISSIONS_KEY } from '@/common/decorators/require-permission.decorator';
import { Permission } from '@/common/enums/permissions.enum';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
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
