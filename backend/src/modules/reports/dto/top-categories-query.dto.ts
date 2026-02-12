import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TopCategoriesQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn(['income', 'expense', 'all'])
  type?: 'income' | 'expense' | 'all';

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  counterparties?: string;

  @IsOptional()
  @IsString()
  statuses?: string;

  @IsOptional()
  @IsString()
  keywords?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @Min(0)
  amountMin?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @Min(0)
  amountMax?: number;

  @IsOptional()
  @IsString()
  currencies?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  approved?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  billable?: boolean;

  @IsOptional()
  @IsString()
  has?: string;

  @IsOptional()
  @IsString()
  groupBy?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  exported?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  paid?: boolean;
}
