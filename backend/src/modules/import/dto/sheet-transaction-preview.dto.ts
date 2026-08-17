import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import type { SheetColumnRole } from '../sheets/column-roles';

/** Kept in sync with the `SheetColumnRole` union in `../sheets/column-roles.ts`. */
export const SHEET_COLUMN_ROLES = [
  'ignore',
  'date',
  'amount',
  'debit',
  'credit',
  'description',
  'counterparty',
  'category',
  'wallet',
  'currency',
  'externalId',
] as const satisfies readonly SheetColumnRole[];

export class SheetTransactionPreviewDto {
  @ApiPropertyOptional({ description: 'Google Sheet id to import from' })
  @IsOptional()
  @IsUUID('4')
  googleSheetId?: string;

  @ApiPropertyOptional({ description: 'Public/shared Google Sheets URL to import from' })
  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  sourceUrl?: string;

  @ApiPropertyOptional({ description: 'Worksheet (tab) name' })
  @IsOptional()
  @IsString()
  worksheetName?: string;

  @ApiPropertyOptional({ description: 'A1 notation range to read' })
  @IsOptional()
  @IsString()
  range?: string;

  @ApiPropertyOptional({ description: 'Zero-based index of the header row within the range' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  headerRowIndex?: number;

  @ApiPropertyOptional({
    description: 'Explicit column roles, overriding auto-detection',
    enum: SHEET_COLUMN_ROLES,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(SHEET_COLUMN_ROLES, { each: true })
  roles?: SheetColumnRole[];

  @ApiPropertyOptional({ description: 'ISO 4217 currency code used when a row has none' })
  @IsString()
  @Length(3, 3)
  defaultCurrency: string;

  @ApiPropertyOptional({ description: '1-based sheet row numbers to skip' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  skipRowNumbers?: number[];

  @ApiPropertyOptional({ description: 'Invert the sign of amount/debit/credit values' })
  @IsOptional()
  @IsBoolean()
  invertSign?: boolean;

  @ApiPropertyOptional({ description: 'Display name used for the import session' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;
}
