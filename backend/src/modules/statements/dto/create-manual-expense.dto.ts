import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateManualExpenseDto {
  @IsString()
  @MinLength(1)
  amount: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @MinLength(1)
  merchant: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @MinLength(1)
  categoryId: string;

  @IsString()
  @IsOptional()
  taxRateId?: string;

  @IsDateString()
  date: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  allowDuplicates?: boolean;
}
