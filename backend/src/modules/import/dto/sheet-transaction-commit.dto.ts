import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { SheetTransactionPreviewDto } from './sheet-transaction-preview.dto';

export class SheetTransactionCommitDto extends SheetTransactionPreviewDto {
  @ApiProperty({ description: 'Display name used to build the synthetic statement fileName' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Create categories that do not yet exist in the workspace' })
  @IsOptional()
  @IsBoolean()
  categoryCreateMissing?: boolean;

  @ApiPropertyOptional({ description: 'Wallet name used to resolve target currency' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  walletName?: string;
}
