import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { validateFile } from '../../common/utils/file-validator.util';
import { buildContentDisposition } from '../../common/utils/http-file.util';
import { multerConfig } from '../../config/multer.config';
import type { User } from '../../entities';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BulkApproveDto } from './dto/bulk-approve.dto';
import { ReceiptQueryDto } from './dto/receipt-query.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { UploadReceiptDto } from './dto/upload-receipt.dto';
import { ReceiptsService } from './receipts.service';

type MulterFile = Express.Multer.File;

const SUPPORTED_RECEIPT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'application/pdf',
]);

@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @WorkspaceAuth(Permission.STATEMENT_UPLOAD)
  @UseInterceptors(FilesInterceptor('files', 5, multerConfig))
  async upload(
    @UploadedFiles() files: MulterFile[],
    @Body() dto: UploadReceiptDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    if (!files?.length) {
      throw new BadRequestException('No files provided');
    }

    files.forEach(file => {
      validateFile(file);
      this.assertReceiptFileSupported(file);
    });

    const receipts = await Promise.all(
      files.map(file =>
        this.receiptsService.createFromUpload({
          userId: user.id,
          workspaceId,
          files: [file],
          language: dto.language,
        }),
      ),
    );

    return { receipts };
  }

  @Post('scan')
  @HttpCode(HttpStatus.CREATED)
  @WorkspaceAuth(Permission.STATEMENT_UPLOAD)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async scan(
    @UploadedFile() file: MulterFile,
    @Body() dto: UploadReceiptDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    validateFile(file);
    this.assertReceiptFileSupported(file);

    return this.receiptsService.createFromScan({
      userId: user.id,
      workspaceId,
      file,
      language: dto.language,
    });
  }

  @Get()
  @WorkspaceAuth(Permission.STATEMENT_VIEW)
  async findAll(@WorkspaceId() workspaceId: string, @Query() query: ReceiptQueryDto) {
    return this.receiptsService.findAll(workspaceId, query);
  }

  @Get(':id')
  @WorkspaceAuth(Permission.STATEMENT_VIEW)
  async findOne(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    const receipt = await this.receiptsService.findOne(id, workspaceId);
    if (!receipt) {
      throw new BadRequestException('Receipt not found');
    }
    return receipt;
  }

  @Patch(':id')
  @WorkspaceAuth(Permission.STATEMENT_EDIT)
  async update(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateReceiptDto,
  ) {
    const receipt = await this.receiptsService.update(id, workspaceId, dto);
    if (!receipt) {
      throw new BadRequestException('Receipt not found');
    }
    return receipt;
  }

  @Post(':id/approve')
  @WorkspaceAuth(Permission.STATEMENT_EDIT)
  async approve(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    const result = await this.receiptsService.approve(id, workspaceId);
    if (!result) {
      throw new BadRequestException('Receipt not found');
    }
    return result;
  }

  @Post('bulk-approve')
  @WorkspaceAuth(Permission.STATEMENT_EDIT)
  async bulkApprove(@Body() dto: BulkApproveDto, @WorkspaceId() workspaceId: string) {
    return this.receiptsService.bulkApprove(dto.receiptIds, workspaceId, dto.categoryId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @WorkspaceAuth(Permission.STATEMENT_EDIT)
  async delete(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    await this.receiptsService.delete(id, workspaceId);
  }

  @Get(':id/file')
  @WorkspaceAuth(Permission.STATEMENT_VIEW)
  async getFile(@Param('id') id: string, @WorkspaceId() workspaceId: string, @Res() res: Response) {
    const filePayload = await this.receiptsService.getFilePayload(id, workspaceId);

    if (!filePayload) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'Receipt file not found' });
    }

    res.setHeader('Content-Type', filePayload.mimeType);
    res.setHeader('Content-Disposition', buildContentDisposition('inline', filePayload.fileName));
    res.setHeader('Cache-Control', 'private, max-age=600');
    return res.send(filePayload.buffer);
  }

  private assertReceiptFileSupported(file: MulterFile): void {
    if (!SUPPORTED_RECEIPT_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only image and PDF receipt files are supported');
    }
  }
}
