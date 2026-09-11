import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CustomTableColumnType } from '../../../entities/custom-table-column.entity';
import { GoogleSheetsImportLayoutType } from './google-sheets-import-preview.dto';

export class GoogleSheetsImportColumnDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  index: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsEnum(CustomTableColumnType)
  type?: CustomTableColumnType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  include?: boolean;
}

export type GoogleSheetsImportManualRowTag = 'heading' | 'total';

export class GoogleSheetsImportRowTagDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rowNumber: number;

  @IsString()
  @IsIn(['heading', 'total'])
  tag: GoogleSheetsImportManualRowTag;
}

export class GoogleSheetsImportCommitDto {
  @IsOptional()
  @IsUUID('4')
  googleSheetId?: string;

  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  sourceUrl?: string;

  @IsOptional()
  @IsUUID('4')
  importUserId?: string;

  @IsOptional()
  @IsString()
  worksheetName?: string;

  @IsOptional()
  @IsString()
  range?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  headerRowIndex?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  importData?: boolean;

  @IsOptional()
  @IsEnum(GoogleSheetsImportLayoutType)
  layoutType?: GoogleSheetsImportLayoutType;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GoogleSheetsImportRowTagDto)
  autoRowTags?: GoogleSheetsImportRowTagDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GoogleSheetsImportColumnDto)
  columns?: GoogleSheetsImportColumnDto[];
}
