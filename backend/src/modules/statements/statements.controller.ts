import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { validateFile } from '../../common/utils/file-validator.util';
import { buildContentDisposition } from '../../common/utils/http-file.util';
import { multerConfig } from '../../config/multer.config';
import { EntityType } from '../../entities/audit-event.entity';
import type { User } from '../../entities/user.entity';
import { Audit } from '../audit/decorators/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateManualExpenseDto } from './dto/create-manual-expense.dto';
import { UpdateStatementDto } from './dto/update-statement.dto';
import { UploadStatementDto } from './dto/upload-statement.dto';
import { StatementsService } from './statements.service';

@Controller('statements')
@UseGuards(JwtAuthGuard)
export class StatementsController {
  constructor(
    private readonly statementsService: StatementsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  // Legacy POST /statements endpoint (backward compatibility for single 'file' field)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.STATEMENT_UPLOAD)
  @Audit({ entityType: EntityType.STATEMENT, includeDiff: true, isUndoable: true })
  @UseInterceptors(FilesInterceptor('file', 1, multerConfig))
  async uploadLegacy(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadDto: UploadStatementDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.handleUpload(files, uploadDto, user, workspaceId, idempotencyKey, true);
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.STATEMENT_UPLOAD)
  @Audit({ entityType: EntityType.STATEMENT, includeDiff: true, isUndoable: true })
  @UseInterceptors(FilesInterceptor('files', 2, multerConfig))
  async upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadDto: UploadStatementDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.handleUpload(files, uploadDto, user, workspaceId, idempotencyKey, false);
  }

  @Post('manual-expense')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.STATEMENT_UPLOAD)
  @Audit({ entityType: EntityType.STATEMENT, includeDiff: true, isUndoable: true })
  @UseInterceptors(FilesInterceptor('files', 5, multerConfig))
  async createManualExpense(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() payload: CreateManualExpenseDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.statementsService.createManualExpense({
      user,
      workspaceId,
      files: files || [],
      payload,
    });
  }

  @Post(':id/attach-file')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.STATEMENT_EDIT)
  @Audit({ entityType: EntityType.STATEMENT, includeDiff: true, isUndoable: true })
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async attachFile(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    const uploadedFile = file as Express.Multer.File | undefined;

    if (!uploadedFile) {
      throw new BadRequestException('No file provided');
    }

    validateFile(uploadedFile);
    return this.statementsService.attachFile(id, user.id, workspaceId, uploadedFile);
  }

  private async handleUpload(
    files: Express.Multer.File[],
    uploadDto: UploadStatementDto,
    user: User,
    workspaceId: string,
    idempotencyKey: string | undefined,
    returnUnwrappedSingle: boolean,
  ) {
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    if (files.length > 2) {
      throw new Error('Maximum 2 files allowed');
    }

    // Check idempotency key if provided
    if (idempotencyKey) {
      const cached = await this.idempotencyService.checkKey(idempotencyKey, user.id, workspaceId);
      if (cached) {
        return {
          ...cached.data,
          cached: true,
        };
      }
    }

    // Validate each file
    files.forEach(validateFile);

    // Process each file
    const results = await Promise.all(
      files.map(file =>
        this.statementsService.create(
          user,
          workspaceId,
          file,
          uploadDto.googleSheetId || undefined,
          uploadDto.walletId || undefined,
          uploadDto.branchId || undefined,
          uploadDto.allowDuplicates ?? false,
          uploadDto.requireManualCategorySelection ?? false,
        ),
      ),
    );

    const responseData = results.map(statement => ({
      ...statement,
      importPreview: statement.parsingDetails?.importPreview ?? null,
    }));

    // Return unwrapped statement for single file (backward compatibility)
    if (returnUnwrappedSingle && responseData.length === 1) {
      const response = {
        ...responseData[0],
        idempotencyKey,
        cached: false,
      };
      if (idempotencyKey) {
        await this.idempotencyService.storeKey(idempotencyKey, user.id, workspaceId, response);
      }
      return response;
    }

    const response = {
      data: responseData,
      idempotencyKey,
      cached: false,
    };

    // Store idempotency key if provided
    if (idempotencyKey) {
      await this.idempotencyService.storeKey(idempotencyKey, user.id, workspaceId, response);
    }

    return response;
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.STATEMENT_VIEW)
  async findAll(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const result = await this.statementsService.findAll(
      workspaceId,
      page ? Number.parseInt(page) : 1,
      limit ? Number.parseInt(limit) : 20,
      search,
      categoryId,
    );

    // Include 'items' field for backward compatibility
    return {
      ...result,
      items: result.data,
    };
  }

  // File routes must be defined before :id route to avoid conflicts
  @Get(':id/file')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.STATEMENT_VIEW)
  async getFile(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Res() res: Response,
  ) {
    const { stream, fileName, mimeType } = await this.statementsService.getFileStream(
      id,
      workspaceId,
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', buildContentDisposition('attachment', fileName));
    stream.on('error', (err: any) => {
      const status =
        err?.code === 'ENOENT' || err?.code === 'EISDIR'
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR;
      if (!res.headersSent) {
        res.status(status).json({
          error: {
            code: status === HttpStatus.NOT_FOUND ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR',
            message:
              status === HttpStatus.NOT_FOUND
                ? 'File not found on disk'
                : 'Failed to download file',
          },
        });
      } else {
        res.destroy(err);
      }
    });
    stream.pipe(res);
  }

  @Get(':id/view')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.STATEMENT_VIEW)
  async viewFile(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Res() res: Response,
  ) {
    const { stream, fileName, mimeType } = await this.statementsService.getFileStream(
      id,
      workspaceId,
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', buildContentDisposition('inline', fileName));
    stream.on('error', (err: any) => {
      const status =
        err?.code === 'ENOENT' || err?.code === 'EISDIR'
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR;
      if (!res.headersSent) {
        res.status(status).json({
          error: {
            code: status === HttpStatus.NOT_FOUND ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR',
            message:
              status === HttpStatus.NOT_FOUND ? 'File not found on disk' : 'Failed to read file',
          },
        });
      } else {
        res.destroy(err);
      }
    });
    stream.pipe(res);
  }

  @Get(':id/thumbnail')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.STATEMENT_VIEW)
  async getThumbnail(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query('width') width: string | undefined,
    @Res() res: Response,
  ) {
    try {
      const parsedWidth = width ? Number(width) : undefined;
      const thumbnail = await this.statementsService.getThumbnail(id, workspaceId, parsedWidth);
      res.setHeader('Content-Type', 'image/png');
      // Cache successful thumbnails for one week
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.send(thumbnail);
    } catch (error) {
      // Log full error details for diagnostics (includes stack when available)
      console.error(`Thumbnail generation error for statement ${id}:`, error);

      // Try to infer HTTP status from Nest HttpException if present
      const statusCode = typeof error?.getStatus === 'function' ? error.getStatus() : null;
      // Prefer structured response message when available, otherwise fallback to generic message
      const message =
        (error && (error?.response?.message || error?.message)) || 'Thumbnail not available';

      // If generation failed on the server side (transient), tell client to retry later and cache briefly
      if (
        (statusCode === HttpStatus.BAD_REQUEST &&
          String(message).toLowerCase().includes('failed to generate')) ||
        String(message).toLowerCase().includes('failed to generate')
      ) {
        // Suggest client to retry after 60 seconds and cache the negative result briefly to avoid hammering
        res.setHeader('Retry-After', '60');
        res.setHeader('Cache-Control', 'public, max-age=60');
        res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          error: {
            code: 'THUMBNAIL_GENERATION_FAILED',
            message: String(message),
          },
        });
        return;
      }

      // If the service indicated a bad request (e.g. not a PDF), forward a 400 with message
      if (statusCode === HttpStatus.BAD_REQUEST) {
        res.status(HttpStatus.BAD_REQUEST).json({
          error: {
            code: 'BAD_REQUEST',
            message: String(message),
          },
        });
        return;
      }

      // Default fallback: not found (thumbnail not available). Cache briefly to reduce repeated attempts.
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.setHeader('Retry-After', '60');
      res.status(HttpStatus.NOT_FOUND).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Thumbnail not available',
        },
      });
    }
  }

  @Post(':id/trash')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.STATEMENT_DELETE)
  async moveToTrash(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.statementsService.moveToTrash(id, user.id, workspaceId);
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.STATEMENT_EDIT)
  async restoreFile(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.statementsService.restoreFile(id, user.id, workspaceId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.STATEMENT_VIEW)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.statementsService.findOne(id, workspaceId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.STATEMENT_EDIT)
  @Audit({ entityType: EntityType.STATEMENT, includeDiff: true, isUndoable: true })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateStatementDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.statementsService.updateMetadata(id, user.id, workspaceId, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.STATEMENT_DELETE)
  @Audit({ entityType: EntityType.STATEMENT, includeDiff: true, isUndoable: true })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query('permanent') permanent?: string,
  ) {
    const isPermanent = permanent === 'true';
    if (isPermanent) {
      await this.statementsService.permanentDelete(id, user.id, workspaceId);
    } else {
      await this.statementsService.moveToTrash(id, user.id, workspaceId);
    }
  }

  @Post(':id/reprocess')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.STATEMENT_EDIT)
  async reprocess(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query('mode') mode?: 'merge' | 'replace',
  ) {
    // Default to 'merge' mode to preserve user edits
    const reprocessMode = mode || 'merge';
    return this.statementsService.reprocess(id, user.id, workspaceId, reprocessMode);
  }

  @Post(':id/commit-import')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.STATEMENT_EDIT)
  async commitImport(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.statementsService.commitImport(id, user.id, workspaceId);
  }
}
