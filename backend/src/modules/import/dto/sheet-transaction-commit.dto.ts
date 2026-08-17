import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { SHEET_COLUMN_ROLES } from './sheet-transaction-preview.dto';

/**
 * Deliberately does NOT extend `SheetTransactionPreviewDto`. `class-validator`'s
 * `MetadataStorage` accumulates decorator metadata per property name across the
 * whole prototype chain, so a subclass redeclaring `name` without `@IsOptional()`
 * does NOT remove the parent's `@IsOptional()` — the field stays effectively
 * optional at runtime regardless of what the subclass's own decorators say
 * (verified empirically: even adding `@IsDefined()` on the subclass doesn't
 * override the inherited `@IsOptional()` short-circuit). Duplicating the shared
 * fields here with independent decorator stacks avoids that whole class of bug.
 */
export class SheetTransactionCommitDto {
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

  @ApiProperty({ description: 'ISO 4217 currency code used when a row has none' })
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
