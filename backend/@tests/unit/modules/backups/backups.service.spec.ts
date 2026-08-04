import { BackupDestinationKind, BackupRunStatus, BackupRunTrigger } from '../../../../src/entities';
import { BackupsService } from '../../../../src/modules/backups/backups.service';

describe('BackupsService', () => {
  const user = { id: 'user-1', workspaceId: 'workspace-1' } as never;

  it('configures an encrypted automatic backup without persisting the password', async () => {
    const configurationRepository = repository();
    const service = createService({ configurationRepository });

    const result = await service.configure(user, {
      destinationKind: BackupDestinationKind.LOCAL,
      destinationPath: 'nightly',
      dailyTime: '02:30',
      timeZone: 'Asia/Jerusalem',
      retentionCount: 7,
      enabled: true,
      password: 'backup password',
    });

    expect(configurationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        encryptedDataKey: 'server-wrapped-data-key',
        passwordEnvelope: expect.any(Object),
        destinationPath: 'nightly',
      }),
    );
    expect(JSON.stringify(configurationRepository.save.mock.calls[0][0])).not.toContain('backup password');
    expect(result).not.toHaveProperty('encryptedDataKey');
    expect(result).not.toHaveProperty('passwordEnvelope');
  });

  it('creates a manual run, stores the encrypted snapshot, and records success', async () => {
    const configuration = {
      id: 'config-1',
      workspaceId: 'workspace-1',
      destinationKind: BackupDestinationKind.LOCAL,
      destinationPath: 'nightly',
      retentionCount: 7,
      encryptedDataKey: 'server-wrapped-data-key',
      passwordEnvelope: { kdf: {}, wrappedDataKey: {} },
      enabled: true,
    };
    const configurationRepository = repository(configuration);
    const runRepository = repository();
    const destination = { store: jest.fn().mockResolvedValue('nightly-workspace-1/backup.lumio-backup') };
    const archive = { create: jest.fn().mockResolvedValue(Buffer.from('encrypted archive')) };
    const service = createService({ configurationRepository, runRepository, destination, archive });

    const run = await service.createRun(user, BackupRunTrigger.MANUAL);

    expect(archive.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace: expect.objectContaining({ id: 'workspace-1' }),
        collections: {
          workspace: [expect.objectContaining({ id: 'workspace-1', name: 'Finance' })],
          categories: [{ id: 'category-1' }],
        },
      }),
    );
    expect(destination.store).toHaveBeenCalledWith(
      configuration,
      expect.stringMatching(/\.lumio-backup$/),
      Buffer.from('encrypted archive'),
    );
    expect(run.status).toBe(BackupRunStatus.SUCCEEDED);
    expect(run.trigger).toBe(BackupRunTrigger.MANUAL);
  });

  it('loads a completed run only from the owner workspace destination', async () => {
    const configuration = {
      id: 'config-1',
      workspaceId: 'workspace-1',
      destinationKind: BackupDestinationKind.LOCAL,
      destinationPath: 'nightly',
    };
    const configurationRepository = repository(configuration);
    const runRepository = repository({
      id: 'run-1',
      workspaceId: 'workspace-1',
      status: BackupRunStatus.SUCCEEDED,
      destinationFile: 'nightly-workspace-1/backup.lumio-backup',
    });
    const destination = { load: jest.fn().mockResolvedValue(Buffer.from('archive')) };
    const service = createService({ configurationRepository, runRepository, destination });

    const result = await service.downloadRun(user, 'run-1');

    expect(destination.load).toHaveBeenCalledWith(configuration, 'nightly-workspace-1/backup.lumio-backup');
    expect(result).toEqual({ fileName: 'backup.lumio-backup', contents: Buffer.from('archive') });
  });

  it('limits configuration and backup runs to the workspace owner', async () => {
    const workspaceRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'workspace-1', ownerId: 'another-user', name: 'Finance' }),
    };
    const service = new BackupsService(
      repository() as never,
      repository() as never,
      workspaceRepository as never,
      { initializeEncryption: jest.fn(), create: jest.fn() } as never,
      { encryptDataKey: jest.fn(), decryptDataKey: jest.fn() } as never,
      { collect: jest.fn() } as never,
      { store: jest.fn(), load: jest.fn() } as never,
    );

    await expect(service.getConfiguration(user)).rejects.toThrow('Only the workspace owner');
  });
});

function repository(existing?: Record<string, unknown>) {
  const save = jest.fn().mockImplementation(value => Promise.resolve({ id: value.id || 'saved-1', ...value }));
  return {
    findOne: jest.fn().mockResolvedValue(existing ?? null),
    create: jest.fn().mockImplementation(value => value),
    save,
    update: jest.fn().mockResolvedValue(undefined),
  };
}

function createService(overrides: Record<string, unknown> = {}) {
  const configurationRepository = overrides.configurationRepository ?? repository();
  const runRepository = overrides.runRepository ?? repository();
  const workspaceRepository = {
    findOne: jest.fn().mockResolvedValue({ id: 'workspace-1', ownerId: 'user-1', name: 'Finance' }),
  };
  const archive =
    overrides.archive ??
    ({
      initializeEncryption: jest.fn().mockResolvedValue({
        dataKey: Buffer.alloc(32, 1),
        passwordEnvelope: { kdf: { salt: 'salt' }, wrappedDataKey: { ciphertext: 'wrapped' } },
      }),
      create: jest.fn(),
    } as never);
  const keyService = {
    encryptDataKey: jest.fn().mockReturnValue('server-wrapped-data-key'),
    decryptDataKey: jest.fn().mockReturnValue(Buffer.alloc(32, 1)),
  };
  const dataService = { collect: jest.fn().mockResolvedValue({ collections: { categories: [{ id: 'category-1' }] }, files: [] }) };
  const destination = overrides.destination ?? { store: jest.fn() };

  return new BackupsService(
    configurationRepository as never,
    runRepository as never,
    workspaceRepository as never,
    archive as never,
    keyService as never,
    dataService as never,
    destination as never,
  );
}
