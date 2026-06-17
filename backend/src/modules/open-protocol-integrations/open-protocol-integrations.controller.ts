import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { IntegrationProvider } from '../../entities';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OpenProtocolIntegrationsService } from './open-protocol-integrations.service';

@Controller('integrations')
export class OpenProtocolIntegrationsController {
  constructor(private readonly openProtocolIntegrationsService: OpenProtocolIntegrationsService) {}

  @Get('s3-compatible/status')
  s3Status(@CurrentUser() user: User) {
    return this.openProtocolIntegrationsService.s3Status(user);
  }

  @Post('s3-compatible/settings')
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  saveS3Settings(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.openProtocolIntegrationsService.saveS3Settings(user, {
      endpoint: this.stringValue(body.endpoint),
      region: this.stringValue(body.region),
      bucket: this.stringValue(body.bucket),
      prefix: this.stringValue(body.prefix),
      accessKeyId: this.stringValue(body.accessKeyId),
      secretAccessKey: this.stringValue(body.secretAccessKey),
      forcePathStyle: this.booleanValue(body.forcePathStyle),
      autoBackup: this.booleanValue(body.autoBackup),
    });
  }

  @Get('s3-compatible/files')
  listS3Files(@CurrentUser() user: User) {
    return this.openProtocolIntegrationsService.listS3Files(user);
  }

  @Post('s3-compatible/import')
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  importS3Files(@CurrentUser() user: User, @Body() body: { fileIds?: string[] }) {
    return this.openProtocolIntegrationsService.importS3Files(user, this.getFileIds(body));
  }

  @Post('s3-compatible/sync')
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  syncS3(@CurrentUser() user: User) {
    return this.openProtocolIntegrationsService.syncS3(user);
  }

  @Delete('s3-compatible')
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  disconnectS3(@CurrentUser() user: User) {
    return this.openProtocolIntegrationsService.disconnect(user, IntegrationProvider.S3_COMPATIBLE);
  }

  @Get('webdav/status')
  webdavStatus(@CurrentUser() user: User) {
    return this.openProtocolIntegrationsService.webdavStatus(user);
  }

  @Post('webdav/settings')
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  saveWebdavSettings(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.openProtocolIntegrationsService.saveWebdavSettings(user, {
      url: this.stringValue(body.url),
      rootPath: this.stringValue(body.rootPath),
      username: this.stringValue(body.username),
      password: this.stringValue(body.password),
    });
  }

  @Get('webdav/files')
  listWebdavFiles(@CurrentUser() user: User) {
    return this.openProtocolIntegrationsService.listWebdavFiles(user);
  }

  @Post('webdav/import')
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  importWebdavFiles(@CurrentUser() user: User, @Body() body: { fileIds?: string[] }) {
    return this.openProtocolIntegrationsService.importWebdavFiles(user, this.getFileIds(body));
  }

  @Post('webdav/sync')
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  syncWebdav(@CurrentUser() user: User) {
    return this.openProtocolIntegrationsService.syncWebdav(user);
  }

  @Delete('webdav')
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  disconnectWebdav(@CurrentUser() user: User) {
    return this.openProtocolIntegrationsService.disconnect(user, IntegrationProvider.WEBDAV);
  }

  @Get('imap/status')
  imapStatus(@CurrentUser() user: User) {
    return this.openProtocolIntegrationsService.imapStatus(user);
  }

  @Post('imap/settings')
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  saveImapSettings(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.openProtocolIntegrationsService.saveImapSettings(user, {
      host: this.stringValue(body.host),
      port: this.numberValue(body.port),
      secure: this.booleanValue(body.secure),
      mailbox: this.stringValue(body.mailbox),
      user: this.stringValue(body.user),
      pass: this.stringValue(body.pass),
    });
  }

  @Post('imap/folders')
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  listImapFolders(@Body() body: Record<string, unknown>) {
    return this.openProtocolIntegrationsService.listImapFolders({
      host: this.stringValue(body.host) ?? '',
      port: this.numberValue(body.port) ?? 993,
      secure: this.booleanValue(body.secure) ?? true,
      user: this.stringValue(body.user) ?? '',
      pass: this.stringValue(body.pass) ?? '',
    });
  }

  @Post('imap/sync')
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  syncImap(@CurrentUser() user: User) {
    return this.openProtocolIntegrationsService.syncImap(user);
  }

  @Delete('imap')
  @WorkspaceAuth(Permission.INTEGRATION_MANAGE)
  disconnectImap(@CurrentUser() user: User) {
    return this.openProtocolIntegrationsService.disconnect(user, IntegrationProvider.IMAP);
  }

  private getFileIds(body: { fileIds?: string[] }): string[] {
    return Array.isArray(body?.fileIds) ? body.fileIds.filter(Boolean) : [];
  }

  private stringValue(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private booleanValue(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
  }

  private numberValue(value: unknown): number | undefined {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }
}
