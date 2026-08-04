import * as crypto from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import type { User } from '../../entities/user.entity';
import { BackupRestoreService } from './backup-restore.service';

type PendingImport = {
  userId: string;
  archiveSha256: string;
  expiresAt: number;
};

@Injectable()
export class BackupImportService {
  private readonly imports = new Map<string, PendingImport>();

  constructor(private readonly restoreService: BackupRestoreService) {}

  async preview(user: User, archive: Buffer, password: string) {
    const preview = await this.restoreService.preview(archive, password);
    this.removeExpired();
    const importId = crypto.randomUUID();
    this.imports.set(importId, {
      userId: user.id,
      archiveSha256: this.hash(archive),
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
    return { importId, ...preview };
  }

  async restore(importId: string, user: User, archive: Buffer, password: string, workspaceName?: string) {
    this.removeExpired();
    const pending = this.imports.get(importId);
    if (!pending || pending.userId !== user.id || pending.archiveSha256 !== this.hash(archive)) {
      throw new BadRequestException('Import preview has expired. Preview this backup again before restoring.');
    }
    this.imports.delete(importId);
    return this.restoreService.restore(archive, password, user, workspaceName);
  }

  private removeExpired(): void {
    const now = Date.now();
    for (const [id, pending] of this.imports) {
      if (pending.expiresAt <= now) this.imports.delete(id);
    }
  }

  private hash(archive: Buffer): string {
    return crypto.createHash('sha256').update(archive).digest('hex');
  }
}
