import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBase64, IsOptional, IsString, IsUUID } from 'class-validator';

export class WebhookReceiptUploadDto {
  @ApiPropertyOptional({ description: 'File content as base64 string' })
  @IsBase64()
  @IsOptional()
  fileBase64?: string;

  @ApiPropertyOptional({ description: 'Original filename (required when using fileBase64)' })
  @IsString()
  @IsOptional()
  fileName?: string;

  @ApiPropertyOptional({ description: 'Language hint for OCR (e.g. "ru", "en")' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Target wallet ID' })
  @IsUUID()
  @IsOptional()
  walletId?: string;
}
