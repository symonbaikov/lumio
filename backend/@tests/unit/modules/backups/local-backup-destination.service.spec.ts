import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { LocalBackupDestinationService } from '../../../../src/modules/backups/local-backup-destination.service';

describe('LocalBackupDestinationService', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'lumio-backup-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('stores snapshots atomically inside the configured backup root', async () => {
    const service = new LocalBackupDestinationService(root);

    const stored = await service.put('workspace-1', 'backup-1.lumio-backup', Buffer.from('backup'));

    expect(stored).toBe('workspace-1/backup-1.lumio-backup');
    await expect(fs.readFile(path.join(root, stored), 'utf8')).resolves.toBe('backup');
  });

  it('rejects workspace directories that could escape the configured root', async () => {
    const service = new LocalBackupDestinationService(root);

    await expect(service.put('../outside', 'backup.lumio-backup', Buffer.from('backup'))).rejects.toThrow(
      'invalid backup path',
    );
  });

  it('keeps the requested newest snapshots without touching other workspace folders', async () => {
    const service = new LocalBackupDestinationService(root);
    await service.put('workspace-1', 'backup-1.lumio-backup', Buffer.from('1'));
    await service.put('workspace-1', 'backup-2.lumio-backup', Buffer.from('2'));
    await service.put('workspace-1', 'backup-3.lumio-backup', Buffer.from('3'));
    await service.put('workspace-2', 'backup-1.lumio-backup', Buffer.from('other'));

    await service.retainNewest('workspace-1', 2);

    await expect(service.list('workspace-1')).resolves.toEqual([
      'workspace-1/backup-2.lumio-backup',
      'workspace-1/backup-3.lumio-backup',
    ]);
    await expect(fs.readFile(path.join(root, 'workspace-2/backup-1.lumio-backup'), 'utf8')).resolves.toBe(
      'other',
    );
  });
});
