import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateTaxRateDto {
  @IsString()
  @MinLength(1)
  name: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
