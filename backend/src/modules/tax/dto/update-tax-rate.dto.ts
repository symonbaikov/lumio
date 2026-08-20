import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class UpdateTaxRateDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  rate?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
