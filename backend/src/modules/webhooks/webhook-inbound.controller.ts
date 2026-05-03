import { Body, Controller, Logger, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { multerConfig } from '../../config/multer.config';
import { WebhookTokenGuard } from './guards/webhook-token.guard';
import { WebhookInboundService } from './webhook-inbound.service';
import { WebhookStatementUploadDto } from './dto/webhook-statement-upload.dto';
import { WebhookReceiptUploadDto } from './dto/webhook-receipt-upload.dto';
import type { WebhookEndpoint } from '../../entities/webhook-endpoint.entity';

@ApiTags('Webhook Inbound')
@Controller('webhooks/:token')
@Public()
@UseGuards(WebhookTokenGuard)
export class WebhookInboundController {
  private readonly logger = new Logger(WebhookInboundController.name);

  constructor(private readonly inboundService: WebhookInboundService) {}

  @Post('statements')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({ summary: 'Upload statement via webhook token' })
  async uploadStatement(
    @Req() req: Request & { webhookEndpoint: WebhookEndpoint },
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: WebhookStatementUploadDto,
  ) {
    const result = await this.inboundService.uploadStatement(req.webhookEndpoint, file ?? null, dto);
    return { success: true, statementId: result.id, status: result.status };
  }

  @Post('receipts')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({ summary: 'Upload receipt via webhook token' })
  async uploadReceipt(
    @Req() req: Request & { webhookEndpoint: WebhookEndpoint },
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: WebhookReceiptUploadDto,
  ) {
    const result = await this.inboundService.uploadReceipt(req.webhookEndpoint, file ?? null, dto);
    return { success: true, receipts: [{ receiptId: result.id, status: result.status }] };
  }
}
