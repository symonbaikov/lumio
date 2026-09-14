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
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { toCaptureLocation } from '../../common/utils/capture-location.util';
import { validateFile } from '../../common/utils/file-validator.util';
import { buildContentDisposition } from '../../common/utils/http-file.util';
import { multerConfig } from '../../config/multer.config';
import type { User } from '../../entities';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BulkApproveDto } from './dto/bulk-approve.dto';
import { ReceiptQueryDto } from './dto/receipt-query.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { UpdateReceiptLocationDto } from './dto/update-receipt-location.dto';
import { UploadReceiptDto } from './dto/upload-receipt.dto';
import { ReceiptsService } from './receipts.service';
import { ReceiptLocationService } from './services/receipt-location.service';

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
  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly locationService: ReceiptLocationService,
  ) {}

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
          captureLocation: toCaptureLocation(dto),
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
      captureLocation: toCaptureLocation(dto),
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

  @Patch(':id/location')
  @WorkspaceAuth(Permission.STATEMENT_EDIT)
  @ApiOperation({ summary: 'Pin the receipt to a point chosen by the user' })
  @ApiResponse({ status: 200, description: 'Receipt with location source "manual"' })
  @ApiResponse({ status: 400, description: 'Receipt not found or coordinates out of range' })
  async setLocation(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateReceiptLocationDto,
  ) {
    const receipt = await this.locationService.setManual(id, workspaceId, dto);
    if (!receipt) {
      throw new BadRequestException('Receipt not found');
    }
    return receipt;
  }

  @Delete(':id/location')
  @WorkspaceAuth(Permission.STATEMENT_EDIT)
  @ApiOperation({
    summary: 'Drop the manual point and recompute it from the merchant address or photo',
  })
  @ApiResponse({ status: 200, description: 'Receipt with the automatically resolved location' })
  @ApiResponse({ status: 400, description: 'Receipt not found' })
  async resetLocation(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    const receipt = await this.locationService.resetToAuto(id, workspaceId);
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
