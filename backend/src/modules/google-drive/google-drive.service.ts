import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { google } from 'googleapis';
import { pipeline } from 'stream/promises';
import type { Repository } from 'typeorm';
import { FileStorageService } from '../../common/services/file-storage.service';
import { decryptText, encryptText } from '../../common/utils/encryption.util';
import { validateFile } from '../../common/utils/file-validator.util';
import { normalizeFilename } from '../../common/utils/filename.util';
import { resolveUploadsDir } from '../../common/utils/uploads.util';
import {
  ActorType,
  AuditAction,
  DriveSettings,
  EntityType,
  Integration,
  IntegrationProvider,
  IntegrationStatus,
  IntegrationToken,
  Statement,
  User,
} from '../../entities';
import { AuditService } from '../audit/audit.service';
import { StatementsService } from '../statements/statements.service';
import type { ImportDriveFilesDto } from './dto/import-drive-files.dto';
import type { UpdateDriveSettingsDto } from './dto/update-drive-settings.dto';

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
];

const DEFAULT_SYNC_TIME = '03:00';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);

  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepository: Repository<Integration>,
    @InjectRepository(IntegrationToken)
    private readonly integrationTokenRepository: Repository<IntegrationToken>,
    @InjectRepository(DriveSettings)
    private readonly driveSettingsRepository: Repository<DriveSettings>,
    @InjectRepository(Statement)
    private readonly statementRepository: Repository<Statement>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly statementsService: StatementsService,
    private readonly fileStorageService: FileStorageService,
    private readonly auditService: AuditService,
  ) {}

  private getClientId() {
    return process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
  }

  private getClientSecret() {
    return process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
  }

  private getRedirectUri() {
    return process.env.GOOGLE_DRIVE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || '';
  }

  private getFrontendBaseUrl() {
    return process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
  }

  private getStateSecret() {
    return process.env.GOOGLE_DRIVE_STATE_SECRET || process.env.JWT_SECRET || 'lumio-state';
  }

  private getOAuthClient() {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    const redirectUri = this.getRedirectUri();
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('Google Drive OAuth is not configured');
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private base64UrlDecode(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return Buffer.from(padded, 'base64').toString('utf8');
  }

  private signState(payload: string): string {
    const hmac = crypto.createHmac('sha256', this.getStateSecret());
    hmac.update(payload);
    return hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private buildState(payload: Record<string, unknown>): string {
    const encoded = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.signState(encoded);
    return `${encoded}.${signature}`;
  }

  private parseState(state: string): Record<string, unknown> {
    const [encoded, signature] = (state || '').split('.');
    if (!encoded || !signature) {
      throw new BadRequestException('Invalid OAuth state');
    }
    const expected = this.signState(encoded);
    if (expected !== signature) {
      throw new BadRequestException('Invalid OAuth state signature');
    }
    const json = this.base64UrlDecode(encoded);
    return JSON.parse(json);
  }

  private async getWorkspaceId(userId: string): Promise<string | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'workspaceId'],
    });
    return user?.workspaceId ?? null;
  }

  private async findIntegrationForUser(userId: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    const where = workspaceId
      ? { workspaceId, provider: IntegrationProvider.GOOGLE_DRIVE }
      : {
          connectedByUserId: userId,
          provider: IntegrationProvider.GOOGLE_DRIVE,
        };

    const integration = await this.integrationRepository.findOne({
      where,
      relations: ['token', 'driveSettings'],
    });

    return { integration, workspaceId };
  }

  private async ensureIntegration(userId: string) {
    const { integration } = await this.findIntegrationForUser(userId);
    if (!integration) {
      throw new NotFoundException('Google Drive integration not found');
    }
    return integration;
  }

  getAuthUrl(user: User): string {
    const client = this.getOAuthClient();
    const state = this.buildState({
      userId: user.id,
      workspaceId: user.workspaceId || null,
      redirect: `${this.getFrontendBaseUrl()}/integrations/google-drive`,
    });

    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: DRIVE_SCOPES,
      state,
    });
  }

  async handleOAuthCallback(params: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<string> {
    const redirectBase = `${this.getFrontendBaseUrl()}/integrations/google-drive`;
    if (params.error) {
      return `${redirectBase}?status=error&reason=${encodeURIComponent(params.error)}`;
    }
    if (!params.code || !params.state) {
      return `${redirectBase}?status=error&reason=missing_code`;
    }

    let state: Record<string, unknown>;
    try {
      state = this.parseState(params.state);
    } catch (error) {
      return `${redirectBase}?status=error&reason=bad_state`;
    }

    const userId = typeof state.userId === 'string' ? state.userId : null;
    if (!userId) {
      return `${redirectBase}?status=error&reason=missing_user`;
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'workspaceId', 'timeZone'],
    });

    if (!user) {
      return `${redirectBase}?status=error&reason=user_not_found`;
    }

    const client = this.getOAuthClient();
    const { tokens } = await client.getToken(params.code);
    const accessToken = tokens.access_token || '';
    const refreshToken = tokens.refresh_token || '';

    if (!accessToken && !refreshToken) {
      return `${redirectBase}?status=error&reason=missing_tokens`;
    }

    const workspaceId = user.workspaceId || null;
    const existing =
      (await this.integrationRepository.findOne({
        where: workspaceId
          ? { workspaceId, provider: IntegrationProvider.GOOGLE_DRIVE }
          : {
              connectedByUserId: user.id,
              provider: IntegrationProvider.GOOGLE_DRIVE,
            },
        relations: ['token', 'driveSettings'],
      })) || null;

    const integration =
      existing ||
      this.integrationRepository.create({
        provider: IntegrationProvider.GOOGLE_DRIVE,
        workspaceId,
        connectedByUserId: user.id,
      });

    integration.status = IntegrationStatus.CONNECTED;
    integration.scopes = tokens.scope
      ? tokens.scope.split(' ')
      : integration.scopes || DRIVE_SCOPES;
    integration.connectedByUserId = user.id;

    const savedIntegration = await this.integrationRepository.save(integration);

    const tokenRecord =
      existing?.token ||
      this.integrationTokenRepository.create({
        integrationId: savedIntegration.id,
        accessToken: '',
        refreshToken: '',
      });

    if (accessToken) {
      tokenRecord.accessToken = encryptText(accessToken);
    }
    if (refreshToken) {
      tokenRecord.refreshToken = encryptText(refreshToken);
    }
    if (tokens.expiry_date) {
      tokenRecord.expiresAt = new Date(tokens.expiry_date);
    }

    if (tokenRecord.accessToken && tokenRecord.refreshToken) {
      await this.integrationTokenRepository.save(tokenRecord);
    }

    let settings =
      existing?.driveSettings ||
      this.driveSettingsRepository.create({
        integrationId: savedIntegration.id,
      });

    if (!settings.syncTime) {
      settings.syncTime = DEFAULT_SYNC_TIME;
    }
    if (!settings.timeZone) {
      settings.timeZone = user.timeZone || 'UTC';
    }
    settings.syncEnabled = settings.syncEnabled ?? true;

    settings = await this.driveSettingsRepository.save(settings);

    try {
      await this.ensureDefaultFolder(savedIntegration, settings);
    } catch (error) {
      this.logger.warn(`Failed to create default Drive folder: ${error}`);
    }

    return `${redirectBase}?status=connected`;
  }

  async getStatus(userId: string) {
    const { integration } = await this.findIntegrationForUser(userId);
    if (!integration) {
      return { connected: false, status: IntegrationStatus.DISCONNECTED };
    }

    let status = integration.status;
    if (
      status === IntegrationStatus.CONNECTED &&
      (!integration.token?.refreshToken || !integration.token?.accessToken)
    ) {
      status = IntegrationStatus.NEEDS_REAUTH;
    }

    return {
      connected: status === IntegrationStatus.CONNECTED,
      status,
      settings: integration.driveSettings
        ? {
            folderId: integration.driveSettings.folderId,
            folderName: integration.driveSettings.folderName,
            syncEnabled: integration.driveSettings.syncEnabled,
            syncTime: integration.driveSettings.syncTime,
            timeZone: integration.driveSettings.timeZone,
            lastSyncAt: integration.driveSettings.lastSyncAt,
          }
        : null,
      scopes: integration.scopes || [],
    };
  }

  async disconnect(userId: string) {
    const integration = await this.ensureIntegration(userId);
    if (integration.token) {
      await this.integrationTokenRepository.delete({
        integrationId: integration.id,
      });
    }
    integration.status = IntegrationStatus.DISCONNECTED;
    await this.integrationRepository.save(integration);
    return { ok: true };
  }

  async updateSettings(userId: string, dto: UpdateDriveSettingsDto) {
    const integration = await this.ensureIntegration(userId);
    let settings =
      integration.driveSettings ||
      this.driveSettingsRepository.create({ integrationId: integration.id });

    if (dto.folderId !== undefined) {
      settings.folderId = dto.folderId || null;
    }
    if (dto.folderName !== undefined) {
      settings.folderName = dto.folderName || null;
    }
    if (dto.syncEnabled !== undefined) {
      settings.syncEnabled = dto.syncEnabled;
    }
    if (dto.syncTime !== undefined) {
      settings.syncTime = dto.syncTime;
    }
    if (dto.timeZone !== undefined) {
      settings.timeZone = dto.timeZone || null;
    }

    settings = await this.driveSettingsRepository.save(settings);
    return {
      ok: true,
      settings,
    };
  }

  private async ensureValidAccessToken(integration: Integration): Promise<string> {
    if (!integration.token) {
      throw new BadRequestException('Integration token missing');
    }
    const refreshToken = decryptText(integration.token.refreshToken);
    let accessToken = decryptText(integration.token.accessToken);
    const expiresAt = integration.token.expiresAt?.getTime() || 0;

    const shouldRefresh = !accessToken || (expiresAt && expiresAt <= Date.now() + 60 * 1000);
    if (!shouldRefresh) {
      return accessToken;
    }

    try {
      const client = this.getOAuthClient();
      client.setCredentials({ refresh_token: refreshToken });
      const { token } = await client.getAccessToken();
      const newAccessToken = token || client.credentials.access_token;
      if (!newAccessToken) {
        throw new Error('Missing access token');
      }
      accessToken = newAccessToken;

      integration.token.accessToken = encryptText(accessToken);
      if (client.credentials.expiry_date) {
        integration.token.expiresAt = new Date(client.credentials.expiry_date);
      }
      await this.integrationTokenRepository.save(integration.token);
      return accessToken;
    } catch (error) {
      integration.status = IntegrationStatus.NEEDS_REAUTH;
      await this.integrationRepository.save(integration);
      throw new BadRequestException('Google Drive authorization expired');
    }
  }

  private async getDriveClient(integration: Integration) {
    if (!integration.token) {
      throw new BadRequestException('Integration token missing');
    }
    const accessToken = await this.ensureValidAccessToken(integration);
    const refreshToken = decryptText(integration.token.refreshToken);
    const client = this.getOAuthClient();
    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return google.drive({ version: 'v3', auth: client });
  }

  async getPickerToken(userId: string) {
    const integration = await this.ensureIntegration(userId);
    const accessToken = await this.ensureValidAccessToken(integration);
    return { accessToken };
  }

  private async ensureDefaultFolder(integration: Integration, settings: DriveSettings) {
    if (settings.folderId) return settings;
    const drive = await this.getDriveClient(integration);

    const response = await drive.files.create({
      requestBody: {
        name: 'Lumio',
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id,name',
    });

    const folderId = response.data.id || null;
    const folderName = response.data.name || null;
    if (folderId) {
      settings.folderId = folderId;
      settings.folderName = folderName;
      return this.driveSettingsRepository.save(settings);
    }
    return settings;
  }

  async importFiles(userId: string, dto: ImportDriveFilesDto) {
    const integration = await this.ensureIntegration(userId);
    const drive = await this.getDriveClient(integration);
    const uploadsDir = resolveUploadsDir();
    const user = await this.userRepository.findOneOrFail({
      where: { id: userId },
    });

    const results: Array<{
      fileId: string;
      status: 'ok' | 'error';
      message?: string;
    }> = [];

    for (const fileId of dto.fileIds) {
      try {
        const meta = await drive.files.get({
          fileId,
          fields: 'id,name,mimeType,size',
        });

        const mimeType = meta.data.mimeType || '';
        if (!ALLOWED_MIME_TYPES.has(mimeType)) {
          results.push({
            fileId,
            status: 'error',
            message: `Unsupported file type: ${mimeType}`,
          });
          continue;
        }

        const size = meta.data.size ? Number.parseInt(meta.data.size, 10) : 0;
        if (size && Number.isFinite(size) && size > 10 * 1024 * 1024) {
          results.push({
            fileId,
            status: 'error',
            message: 'File size exceeds limit',
          });
          continue;
        }

        const originalName = normalizeFilename(meta.data.name || `drive-file-${fileId}`);
        const safeBaseName = path.basename(originalName);
        const fileName = `${Date.now()}-${fileId}-${safeBaseName}`;
        const filePath = path.join(uploadsDir, fileName);

        const download = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'stream' },
        );

        await pipeline(download.data as NodeJS.ReadableStream, fs.createWriteStream(filePath));

        const fileStats = await fs.promises.stat(filePath);
        const file: Express.Multer.File = {
          fieldname: 'file',
          originalname: safeBaseName,
          encoding: '7bit',
          mimetype: mimeType,
          size: fileStats.size,
          destination: uploadsDir,
          filename: fileName,
          path: filePath,
          buffer: Buffer.alloc(0),
        } as Express.Multer.File;

        validateFile(file);

        await this.statementsService.create(
          user,
          user.workspaceId,
          file,
          undefined,
          undefined,
          undefined,
          false,
        );

        results.push({ fileId, status: 'ok' });
      } catch (error: any) {
        results.push({
          fileId,
          status: 'error',
          message: error?.response?.data?.message || error?.message || 'Import failed',
        });
      }
    }

    return {
      ok: true,
      results,
    };
  }

  async syncNow(userId: string) {
    const integration = await this.ensureIntegration(userId);
    const result = await this.syncIntegration(integration);
    return result;
  }

  async syncDueIntegrations() {
    const integrations = await this.integrationRepository.find({
      where: {
        provider: IntegrationProvider.GOOGLE_DRIVE,
        status: IntegrationStatus.CONNECTED,
      },
      relations: ['token', 'driveSettings'],
    });

    const now = new Date();
    for (const integration of integrations) {
      if (!integration.driveSettings?.syncEnabled) {
        continue;
      }
      const timeZone = integration.driveSettings.timeZone || 'UTC';
      if (!this.shouldSyncNow(now, integration.driveSettings, timeZone)) {
        continue;
      }
      try {
        await this.syncIntegration(integration);
      } catch (error) {
        this.logger.error(`Drive sync failed for integration ${integration.id}: ${error}`);
      }
    }
  }

  private shouldSyncNow(now: Date, settings: DriveSettings, timeZone: string): boolean {
    const [hourStr, minuteStr] = (settings.syncTime || DEFAULT_SYNC_TIME).split(':');
    const syncHour = Number.parseInt(hourStr || '0', 10);
    const syncMinute = Number.parseInt(minuteStr || '0', 10);

    const nowParts = this.getTimeParts(now, timeZone);
    const lastSyncParts = settings.lastSyncAt
      ? this.getTimeParts(settings.lastSyncAt, timeZone)
      : null;

    if (lastSyncParts?.dateKey === nowParts.dateKey) {
      return false;
    }

    const nowTotal = nowParts.hour * 60 + nowParts.minute;
    const syncTotal = syncHour * 60 + syncMinute;
    const withinWindow = nowTotal >= syncTotal && nowTotal < syncTotal + 15;

    return withinWindow;
  }

  private getTimeParts(date: Date, timeZone: string) {
    let tz = timeZone;
    try {
      Intl.DateTimeFormat('en-US', { timeZone }).format(date);
    } catch {
      tz = 'UTC';
    }
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const lookup = (type: string) => parts.find(p => p.type === type)?.value || '00';
    const year = lookup('year');
    const month = lookup('month');
    const day = lookup('day');
    const hour = Number.parseInt(lookup('hour'), 10);
    const minute = Number.parseInt(lookup('minute'), 10);
    return {
      dateKey: `${year}-${month}-${day}`,
      hour,
      minute,
    };
  }

  private async resolveDriveFilename(
    drive: ReturnType<typeof google.drive>,
    folderId: string | null,
    fileName: string,
  ): Promise<string> {
    if (!folderId) {
      return fileName;
    }
    const escapedName = fileName.replace(/'/g, "\\'");
    const q = `name = '${escapedName}' and '${folderId}' in parents and trashed = false`;
    const res = await drive.files.list({
      q,
      spaces: 'drive',
      fields: 'files(id,name)',
      pageSize: 1,
    });
    if (res.data.files && res.data.files.length > 0) {
      const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);
      const dot = fileName.lastIndexOf('.');
      if (dot === -1) {
        return `${fileName}-${stamp}`;
      }
      return `${fileName.slice(0, dot)}-${stamp}${fileName.slice(dot)}`;
    }
    return fileName;
  }

  private async syncIntegration(integration: Integration) {
    if (!integration.driveSettings) {
      throw new BadRequestException('Drive settings missing');
    }
    const drive = await this.getDriveClient(integration);
    const lastSyncAt = integration.driveSettings.lastSyncAt;

    const qb = this.statementRepository
      .createQueryBuilder('statement')
      .leftJoin('statement.user', 'user')
      .where('statement.deletedAt IS NULL')
      .orderBy('statement.createdAt', 'ASC');

    if (integration.workspaceId) {
      qb.andWhere('user.workspaceId = :workspaceId', {
        workspaceId: integration.workspaceId,
      });
    } else if (integration.connectedByUserId) {
      qb.andWhere('statement.userId = :userId', {
        userId: integration.connectedByUserId,
      });
    }

    if (lastSyncAt) {
      qb.andWhere('statement.createdAt > :lastSyncAt', { lastSyncAt });
    }

    const statements = await qb.getMany();
    let uploaded = 0;

    for (const statement of statements) {
      try {
        const { stream, fileName, mimeType } =
          await this.fileStorageService.getStatementFileStream(statement);
        const driveName = await this.resolveDriveFilename(
          drive,
          integration.driveSettings.folderId || null,
          fileName,
        );
        await drive.files.create({
          requestBody: {
            name: driveName,
            parents: integration.driveSettings.folderId
              ? [integration.driveSettings.folderId]
              : undefined,
          },
          media: {
            mimeType,
            body: stream as NodeJS.ReadableStream,
          },
          fields: 'id',
        });
        uploaded += 1;
      } catch (error) {
        this.logger.warn(`Failed to sync statement ${statement.id} to Google Drive: ${error}`);
      }
    }

    integration.driveSettings.lastSyncAt = new Date();
    await this.driveSettingsRepository.save(integration.driveSettings);

    try {
      // Audit: record Google Drive sync/export activity.
      await this.auditService.createEvent({
        workspaceId: integration.workspaceId ?? null,
        actorType: ActorType.INTEGRATION,
        actorId: integration.connectedByUserId ?? null,
        actorLabel: 'Google Drive Sync',
        entityType: EntityType.INTEGRATION,
        entityId: integration.id,
        action: AuditAction.EXPORT,
        meta: {
          provider: IntegrationProvider.GOOGLE_DRIVE,
          uploaded,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Audit event failed for Google Drive sync: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      ok: true,
      uploaded,
      lastSyncAt: integration.driveSettings.lastSyncAt,
    };
  }
}
