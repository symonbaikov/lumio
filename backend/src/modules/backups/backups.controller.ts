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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BackupRunTrigger } from '../../entities';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BackupImportService } from './backup-import.service';
import { BackupsService, type UpdateBackupConfiguration } from './backups.service';

type MulterFile = Express.Multer.File;

@Controller('backups')
@UseGuards(JwtAuthGuard)
export class BackupsController {
  constructor(
    private readonly backupsService: BackupsService,
    private readonly importService: BackupImportService,
  ) {}

  @Get('config')
  getConfiguration(@CurrentUser() user: User) {
    return this.backupsService.getConfiguration(user);
  }

  @Put('config')
  configure(@CurrentUser() user: User, @Body() body: UpdateBackupConfiguration) {
    return this.backupsService.configure(user, body);
  }

  @Get('runs')
  listRuns(@CurrentUser() user: User) {
    return this.backupsService.listRuns(user);
  }

  @Post('runs')
  createRun(@CurrentUser() user: User) {
    return this.backupsService.createRun(user, BackupRunTrigger.MANUAL);
  }

  @Get('runs/:id/download')
  async downloadRun(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Res() response: Response,
  ): Promise<void> {
    const { fileName, contents } = await this.backupsService.downloadRun(user, id);
    response.setHeader('Content-Type', 'application/octet-stream');
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    response.send(contents);
  }

  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file'))
  previewImport(
    @CurrentUser() user: User,
    @UploadedFile() file: MulterFile | undefined,
    @Body('password') password: string,
  ) {
    return this.importService.preview(user, this.requiredFile(file), password);
  }

  @Post('imports/:id/restore')
  @UseInterceptors(FileInterceptor('file'))
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
