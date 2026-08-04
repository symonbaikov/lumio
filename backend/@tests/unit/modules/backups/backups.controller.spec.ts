import { BackupDestinationKind, BackupRunTrigger } from '../../../../src/entities';
import { BackupsController } from '../../../../src/modules/backups/backups.controller';

describe('BackupsController', () => {
  it('forwards a configuration update and manual run to the backups service', async () => {
    const service = {
      configure: jest.fn().mockResolvedValue({ destinationKind: BackupDestinationKind.LOCAL }),
      createRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
    };
    const controller = new BackupsController(service as never, {} as never);
    const user = { id: 'user-1', workspaceId: 'workspace-1' } as never;

    await controller.configure(user, {
      destinationKind: BackupDestinationKind.LOCAL,
      destinationPath: 'nightly',
      password: 'backup password',
    });
    await controller.createRun(user);

    expect(service.configure).toHaveBeenCalledWith(user, expect.objectContaining({ destinationPath: 'nightly' }));
    expect(service.createRun).toHaveBeenCalledWith(user, BackupRunTrigger.MANUAL);
  });

  it('returns an owner-authorized archive as an attachment', async () => {
    const service = {
      downloadRun: jest.fn().mockResolvedValue({ fileName: 'backup.lumio-backup', contents: Buffer.from('backup') }),
    };
    const controller = new BackupsController(service as never, {} as never);
    const response = { setHeader: jest.fn(), send: jest.fn() };
    const user = { id: 'user-1', workspaceId: 'workspace-1' } as never;

    await controller.downloadRun('run-1', user, response as never);

    expect(service.downloadRun).toHaveBeenCalledWith(user, 'run-1');
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    expect(response.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="backup.lumio-backup"');
    expect(response.send).toHaveBeenCalledWith(Buffer.from('backup'));
  });

  it('returns the new workspace identity after a confirmed import', async () => {
    const imports = { restore: jest.fn().mockResolvedValue({ id: 'workspace-new', name: 'Restored Finance' }) };
    const controller = new BackupsController({} as never, imports as never);
    const result = await controller.restoreImport(
      'import-1',
      { id: 'user-1' } as never,
      { buffer: Buffer.from('archive') } as never,
      'password',
    );

    expect(result).toEqual({ workspaceId: 'workspace-new', workspaceName: 'Restored Finance' });
  });
});
