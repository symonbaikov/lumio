import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { buildContentDisposition } from '../../common/utils/http-file.util';
import { BackupRunTrigger } from '../../entities';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BackupImportService } from './backup-import.service';
import { BackupsService, type UpdateBackupConfiguration } from './backups.service';

type MulterFile = Express.Multer.File;

// FileInterceptor defaults to memory storage with no cap, so the whole body was
// buffered before any handler ran. Backups are larger than ordinary uploads
// (which cap at 10MB via multerConfig) but still need a ceiling.
const BACKUP_UPLOAD_OPTIONS = { limits: { fileSize: 200 * 1024 * 1024 } };

@Controller('backups')
@UseGuards(JwtAuthGuard)
export class BackupsController {
  constructor(
    private readonly backupsService: BackupsService,
    private readonly importService: BackupImportService,
  ) {}

  @Get('config')
  @UseGuards(WorkspaceContextGuard)
  getConfiguration(@CurrentUser() user: User, @WorkspaceId() workspaceId: string) {
    return this.backupsService.getConfiguration(user, workspaceId);
  }

  @Put('config')
  @UseGuards(WorkspaceContextGuard)
  configure(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() body: UpdateBackupConfiguration,
  ) {
    return this.backupsService.configure(user, workspaceId, body);
  }

  @Get('runs')
  @UseGuards(WorkspaceContextGuard)
  listRuns(@CurrentUser() user: User, @WorkspaceId() workspaceId: string) {
    return this.backupsService.listRuns(user, workspaceId);
  }

  @Post('runs')
  @UseGuards(WorkspaceContextGuard)
  createRun(@CurrentUser() user: User, @WorkspaceId() workspaceId: string) {
    return this.backupsService.createRun(user, workspaceId, BackupRunTrigger.MANUAL);
  }

  @Get('runs/:id/download')
  @UseGuards(WorkspaceContextGuard)
  async downloadRun(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Res() response: Response,
  ): Promise<void> {
    const { fileName, contents } = await this.backupsService.downloadRun(user, workspaceId, id);
    response.setHeader('Content-Type', 'application/octet-stream');
    response.setHeader('Content-Disposition', buildContentDisposition('attachment', fileName));
    response.send(contents);
  }

  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file', BACKUP_UPLOAD_OPTIONS))
  previewImport(
    @CurrentUser() user: User,
    @UploadedFile() file: MulterFile | undefined,
    @Body('password') password: string,
  ) {
    return this.importService.preview(user, this.requiredFile(file), password);
  }

  @Post('imports/:id/restore')
  @UseInterceptors(FileInterceptor('file', BACKUP_UPLOAD_OPTIONS))
  async restoreImport(
    @Param('id') importId: string,
    @CurrentUser() user: User,
    @UploadedFile() file: MulterFile | undefined,
    @Body('password') password: string,
    @Body('workspaceName') workspaceName?: string,
  ) {
    const workspace = await this.importService.restore(
      importId,
      user,
      this.requiredFile(file),
      password,
      workspaceName,
    );
    return { workspaceId: workspace.id, workspaceName: workspace.name };
  }

  private requiredFile(file: MulterFile | undefined): Buffer {
    if (!file?.buffer?.length) throw new BadRequestException('Backup file is required');
    return file.buffer;
  }
}
