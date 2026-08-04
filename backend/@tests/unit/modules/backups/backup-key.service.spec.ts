import * as crypto from 'node:crypto';
import { BackupKeyService } from '../../../../src/modules/backups/backup-key.service';

describe('BackupKeyService', () => {
  it('wraps the automatic backup key with the server master key', () => {
    const service = new BackupKeyService('backup-master-key-for-test');
    const key = crypto.randomBytes(32);

    const encrypted = service.encryptDataKey(key);

    expect(encrypted).not.toContain(key.toString('base64'));
    expect(service.decryptDataKey(encrypted)).toEqual(key);
  });

  it('does not accept a key wrapped by a different server master key', () => {
    const key = crypto.randomBytes(32);
    const encrypted = new BackupKeyService('first-master-key').encryptDataKey(key);

    expect(() => new BackupKeyService('second-master-key').decryptDataKey(encrypted)).toThrow(
      'backup key cannot be decrypted',
    );
  });
});
