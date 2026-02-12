import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UploadStatementDto {
  @IsUUID()
  @IsOptional()
  googleSheetId?: string;

  @IsUUID()
  @IsOptional()
  walletId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  allowDuplicates?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  requireManualCategorySelection?: boolean;
}
