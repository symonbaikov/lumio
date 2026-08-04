import { BackupImportService } from '../../../../src/modules/backups/backup-import.service';

describe('BackupImportService', () => {
  it('requires a verified preview by the same user before restoring its exact archive', async () => {
    const restore = {
      preview: jest.fn().mockResolvedValue({ workspaceName: 'Finance', fileCount: 2 }),
      restore: jest.fn().mockResolvedValue({ id: 'new-workspace' }),
    };
    const service = new BackupImportService(restore as never);
    const user = { id: 'user-1' } as never;
    const archive = Buffer.from('encrypted archive');

    const preview = await service.preview(user, archive, 'password');
    await service.restore(preview.importId, user, archive, 'password');

    expect(restore.restore).toHaveBeenCalledWith(archive, 'password', user, undefined);
  });

  it('rejects a restore with an archive different from the previewed one', async () => {
    const restore = { preview: jest.fn().mockResolvedValue({ workspaceName: 'Finance', fileCount: 2 }), restore: jest.fn() };
    const service = new BackupImportService(restore as never);
    const user = { id: 'user-1' } as never;
    const preview = await service.preview(user, Buffer.from('archive-a'), 'password');

    await expect(service.restore(preview.importId, user, Buffer.from('archive-b'), 'password')).rejects.toThrow('expired');
  });
});
