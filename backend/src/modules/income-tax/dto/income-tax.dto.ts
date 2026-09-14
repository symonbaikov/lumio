import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { TaxpayerType } from '../rule-packs/types';

const MIN_TAX_YEAR = 2000;
const TAXPAYER_TYPES: TaxpayerType[] = ['self_employed', 'employee', 'company'];

/** A year that can have a declaration: not before 2000, not beyond next year. */
export function parseTaxYear(value: string | number | undefined): number {
  const year = Number(value);
  const maxYear = new Date().getUTCFullYear() + 1;
  if (!Number.isInteger(year) || year < MIN_TAX_YEAR || year > maxYear) {
    throw new BadRequestException(`taxYear must be a year between ${MIN_TAX_YEAR} and ${maxYear}`);
  }
  return year;
}

export class UpdateIncomeTaxProfileDto {
  @IsInt()
  @Min(MIN_TAX_YEAR)
  @Max(2100)
  taxYear: number;

  @IsIn(TAXPAYER_TYPES)
  taxpayerType: TaxpayerType;

  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}

export class IncomeTaxMappingEntryDto {
  @IsUUID()
  categoryId: string;

  /** NULL withdraws the mapping. */
  @ValidateIf((entry: IncomeTaxMappingEntryDto) => entry.lineKey !== null)
  @IsString()
  @MaxLength(64)
  lineKey: string | null;
}

export class SaveIncomeTaxMappingsDto {
  @IsInt()
  @Min(MIN_TAX_YEAR)
  @Max(2100)
  taxYear: number;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => IncomeTaxMappingEntryDto)
  entries: IncomeTaxMappingEntryDto[];
}
