import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { Injectable, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { In, type DataSource, type EntityMetadata } from 'typeorm';
import { FileStorageService } from '../../common/services/file-storage.service';
import type { Statement } from '../../entities';

const EXCLUDED_TABLES = new Set([
  'api_keys',
  'auth_sessions',
  'backup_configurations',
  'backup_runs',
  'gmail_watch_subscriptions',
  'google_sheets',
  'google_sheets_credentials',
  'idempotency_keys',
  'import_sessions',
  'integration_tokens',
  'integrations',
  'open_protocol_settings',
  'notifications',
  'report_history',
  'drive_settings',
  'dropbox_settings',
  'gmail_settings',
  'webhook_deliveries',
  'webhook_endpoints',
  'webhook_subscriptions',
]);

const SENSITIVE_PROPERTIES = new Set([
  'accessToken',
  'encryptedSecrets',
  'passwordHash',
  'refreshToken',
  'secret',
  'token',
]);

type BackupSnapshotData = {
  collections: Record<string, unknown[]>;
  files: Array<{ path: string; contents: Buffer }>;
};

@Injectable()
export class BackupDataService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Optional() private readonly fileStorageService?: FileStorageService,
  ) {}

  async collect(workspaceId: string): Promise<BackupSnapshotData> {
    const collections: Record<string, unknown[]> = {};
    const files: Array<{ path: string; contents: Buffer }> = [];
    for (const metadata of this.dataSource.entityMetadatas) {
      if (!this.isWorkspaceScoped(metadata) || EXCLUDED_TABLES.has(metadata.tableName)) continue;
      const repository = this.dataSource.getRepository(metadata.target);
      const rows = await repository.find({ where: { workspaceId } as never });
      const records = rows.map(row => this.toBackupRecord(metadata, row));
      collections[metadata.tableName] = records;
      if (metadata.tableName === 'statements' && this.fileStorageService) {
        await this.collectStatementFiles(rows as Statement[], records, files);
      }
      if (metadata.tableName === 'receipts') {
        await this.collectReceiptAttachments(records, files);
      }
    }
    await this.collectRelatedCollections(collections);
    return { collections, files };
  }

  private isWorkspaceScoped(metadata: EntityMetadata): boolean {
    return metadata.columns.some(column => column.propertyName === 'workspaceId');
  }

  private toBackupRecord(metadata: EntityMetadata, row: unknown): Record<string, unknown> {
    const source = row as Record<string, unknown>;
    return metadata.columns.reduce<Record<string, unknown>>((record, column) => {
      const propertyName = column.propertyName;
      if (!SENSITIVE_PROPERTIES.has(propertyName) && source[propertyName] !== undefined) {
        record[propertyName] = source[propertyName];
      }
      return record;
    }, {});
  }

  private async collectStatementFiles(
    statements: Statement[],
    records: Record<string, unknown>[],
    files: Array<{ path: string; contents: Buffer }>,
  ): Promise<void> {
    const recordsById = new Map(records.map(record => [record.id, record]));
    for (const statement of statements) {
      const file = await this.fileStorageService?.getStatementFileStream(statement);
      if (!file) continue;
      const contents = await this.streamToBuffer(file.stream);
      const safeFileName = path.posix.basename(file.fileName);
      const backupPath = `statements/${statement.id}/${safeFileName}`;
      const record = recordsById.get(statement.id);
      if (record) record.filePath = backupPath;
      files.push({ path: backupPath, contents });
    }
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  private async collectReceiptAttachments(
    records: Record<string, unknown>[],
    files: Array<{ path: string; contents: Buffer }>,
  ): Promise<void> {
    for (const record of records) {
      const paths = Array.isArray(record.attachmentPaths) ? record.attachmentPaths : [];
      const portablePaths: string[] = [];
      for (const [index, sourcePath] of paths.entries()) {
        if (typeof sourcePath !== 'string') continue;
        const safeName = path.posix.basename(sourcePath);
        const backupPath = `receipts/${record.id}/${index}-${safeName}`;
        files.push({ path: backupPath, contents: await fs.readFile(sourcePath) });
        portablePaths.push(backupPath);
      }
      record.attachmentPaths = portablePaths;
    }
  }

  private async collectRelatedCollections(collections: Record<string, unknown[]>): Promise<void> {
    const customTableIds = this.ids(collections.custom_tables);
    await this.collectByReference('custom_table_columns', 'tableId', customTableIds, collections);
    await this.collectByReference('custom_table_rows', 'tableId', customTableIds, collections);
    await this.collectByReference('custom_table_column_styles', 'tableId', customTableIds, collections);
    await this.collectByReference(
      'custom_table_cell_styles',
      'rowId',
      this.ids(collections.custom_table_rows),
      collections,
    );
    await this.collectByReference(
      'google_sheet_rows',
      'googleSheetId',
      this.ids(collections.google_sheets),
      collections,
    );
    await this.collectByReference('file_versions', 'statementId', this.ids(collections.statements), collections);
    collections.file_versions = (collections.file_versions || []).map(record => {
      const value = record as Record<string, unknown>;
      return Buffer.isBuffer(value.fileData)
        ? { ...value, fileData: { encoding: 'base64', value: value.fileData.toString('base64') } }
        : value;
    });
  }

  private async collectByReference(
    tableName: string,
    propertyName: string,
    ids: string[],
    collections: Record<string, unknown[]>,
  ): Promise<void> {
    const metadata = this.dataSource.entityMetadatas.find(item => item.tableName === tableName);
    if (!metadata || ids.length === 0) return;
    const repository = this.dataSource.getRepository(metadata.target);
    const rows = await repository.find({ where: { [propertyName]: In(ids) } as never });
    collections[tableName] = rows.map(row => this.toBackupRecord(metadata, row));
  }

  private ids(records: unknown[] | undefined): string[] {
    return (records || [])
      .map(record => (record as Record<string, unknown>).id)
      .filter((id): id is string => typeof id === 'string');
  }
}
