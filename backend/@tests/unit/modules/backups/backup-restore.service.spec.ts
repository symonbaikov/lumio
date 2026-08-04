import { BackupRestoreService } from '../../../../src/modules/backups/backup-restore.service';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

describe('BackupRestoreService', () => {
  it('restores a backup into a new workspace and remaps workspace and user references', async () => {
    const categoryInsert = jest.fn().mockResolvedValue(undefined);
    const workspaceRepository = {
      create: jest.fn().mockImplementation(value => ({ id: 'new-workspace', ...value })),
      save: jest.fn().mockResolvedValue({ id: 'new-workspace', name: 'Restored finance' }),
      delete: jest.fn(),
    };
    const memberRepository = { create: jest.fn().mockImplementation(value => value), save: jest.fn().mockResolvedValue(undefined) };
    const manager = { getRepository: jest.fn().mockReturnValue({ insert: categoryInsert }) };
    const dataSource = {
      entityMetadatas: [
        {
          tableName: 'categories',
          target: 'Category',
          columns: [{ propertyName: 'id' }, { propertyName: 'workspaceId' }, { propertyName: 'userId' }, { propertyName: 'name' }],
        },
      ],
      transaction: jest.fn().mockImplementation(callback => callback(manager)),
    };
    const archive = {
      open: jest.fn().mockResolvedValue({
        manifest: { workspace: { id: 'old-workspace', name: 'Finance' }, collections: { workspace: 1, categories: 1 }, files: [] },
        collections: {
          workspace: [{ id: 'old-workspace', name: 'Finance', currency: 'KZT' }],
          categories: [{ id: 'old-category', workspaceId: 'old-workspace', userId: 'old-user', name: 'Travel' }],
        },
        files: new Map(),
      }),
    };
    const service = new BackupRestoreService(
      dataSource as never,
      workspaceRepository as never,
      memberRepository as never,
      archive as never,
    );

    const workspace = await service.restore(Buffer.from('archive'), 'backup password', {
      id: 'user-1',
      workspaceId: 'workspace-1',
    } as never, 'Restored finance');

    expect(workspace).toEqual({ id: 'new-workspace', name: 'Restored finance' });
    expect(memberRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'new-workspace', userId: 'user-1', role: 'owner' }),
    );
    expect(categoryInsert).toHaveBeenCalledWith(
      [expect.objectContaining({ workspaceId: 'new-workspace', userId: 'user-1', name: 'Travel' })],
    );
  });

  it('restores statement documents from the portable file collection', async () => {
    const uploads = await fs.mkdtemp(path.join(os.tmpdir(), 'lumio-restore-'));
    const previousUploads = process.env.UPLOADS_DIR;
    process.env.UPLOADS_DIR = uploads;
    const statementInsert = jest.fn().mockResolvedValue(undefined);
    const workspaceRepository = {
      create: jest.fn().mockImplementation(value => ({ id: 'new-workspace', ...value })),
      save: jest.fn().mockResolvedValue({ id: 'new-workspace', name: 'Restored finance' }),
      delete: jest.fn(),
    };
    const memberRepository = { create: jest.fn().mockImplementation(value => value), save: jest.fn().mockResolvedValue(undefined) };
    const manager = { getRepository: jest.fn().mockReturnValue({ insert: statementInsert }) };
    const archive = {
      open: jest.fn().mockResolvedValue({
        manifest: { workspace: { id: 'old-workspace', name: 'Finance' }, collections: { workspace: 1, statements: 1 }, files: [] },
        collections: {
          workspace: [{ id: 'old-workspace', name: 'Finance' }],
          statements: [{ id: 'old-statement', workspaceId: 'old-workspace', userId: 'old-user', fileName: 'bank.csv', filePath: 'statements/old-statement/bank.csv' }],
        },
        files: new Map([['statements/old-statement/bank.csv', Buffer.from('date,amount\n')]]),
      }),
    };
    const service = new BackupRestoreService(
      {
        entityMetadatas: [
          {
            tableName: 'statements',
            target: 'Statement',
            columns: [{ propertyName: 'id' }, { propertyName: 'workspaceId' }, { propertyName: 'userId' }, { propertyName: 'fileName' }, { propertyName: 'filePath' }],
          },
        ],
        transaction: jest.fn().mockImplementation(callback => callback(manager)),
      } as never,
      workspaceRepository as never,
      memberRepository as never,
      archive as never,
    );

    await service.restore(Buffer.from('archive'), 'backup password', { id: 'user-1', workspaceId: 'workspace-1' } as never);

    const inserted = statementInsert.mock.calls[0][0][0];
    await expect(fs.readFile(inserted.filePath, 'utf8')).resolves.toBe('date,amount\n');
    process.env.UPLOADS_DIR = previousUploads;
    await fs.rm(uploads, { recursive: true, force: true });
  });
});
