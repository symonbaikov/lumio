import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const toStringArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const items = (Array.isArray(value) ? value : [value])
    .flatMap(item => String(item).split(','))
    .map(item => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
};

const toNumberValue = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

const toBooleanValue = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return value;
};

export class FilterStatementsDto {
  @IsOptional()
  @Transform(toNumberValue)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(toNumberValue)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  statuses?: string[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  from?: string[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  to?: string[];

  @IsOptional()
  @IsString()
  keywords?: string;

  @IsOptional()
  @Transform(toNumberValue)
  @IsNumber()
  @Min(0)
  amountMin?: number;

  @IsOptional()
  @Transform(toNumberValue)
  @IsNumber()
  @Min(0)
  amountMax?: number;

  @IsOptional()
  @Transform(toBooleanValue)
  @IsBoolean()
  approved?: boolean;

  @IsOptional()
  @Transform(toBooleanValue)
  @IsBoolean()
  billable?: boolean;

  @IsOptional()
  @IsIn(['date', 'status', 'type', 'bank', 'user', 'amount'])
  groupBy?: string;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  has?: string[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  currencies?: string[];

  @IsOptional()
  @Transform(toBooleanValue)
  @IsBoolean()
  exported?: boolean;

  @IsOptional()
  @Transform(toBooleanValue)
  @IsBoolean()
  paid?: boolean;

  @IsOptional()
  @IsIn(['thisMonth', 'lastMonth', 'yearToDate'])
  datePreset?: 'thisMonth' | 'lastMonth' | 'yearToDate';

  @IsOptional()
  @IsIn(['on', 'after', 'before'])
  dateMode?: 'on' | 'after' | 'before';

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
