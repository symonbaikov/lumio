import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

describe('AddWorkspaceBackups migration', () => {
  it('creates the backup configuration and run tables', () => {
    const filePath = path.join(process.cwd(), 'src', 'migrations', '1785900000000-AddWorkspaceBackups.ts');

    expect(existsSync(filePath)).toBe(true);
    const source = readFileSync(filePath, 'utf8');
    expect(source).toContain('CREATE TABLE "backup_configurations"');
    expect(source).toContain('CREATE TABLE "backup_runs"');
    expect(source).toContain('UQ_backup_configurations_workspace');
  });
});
