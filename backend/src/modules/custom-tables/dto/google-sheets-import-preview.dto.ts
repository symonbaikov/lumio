import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, IsUUID, Min } from 'class-validator';

export enum GoogleSheetsImportLayoutType {
  AUTO = 'auto',
  FLAT = 'flat',
  MATRIX = 'matrix',
}

export class GoogleSheetsImportPreviewDto {
  @IsOptional()
  @IsUUID('4')
  googleSheetId?: string;

  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  worksheetName?: string;

  @IsOptional()
  @IsString()
  range?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  headerRowIndex?: number;

  @IsOptional()
  @IsEnum(GoogleSheetsImportLayoutType)
  layoutType?: GoogleSheetsImportLayoutType;
}
