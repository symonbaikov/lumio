import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBudgetDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  limitAmount?: number;

  @IsString()
  @IsOptional()
  currency?: string;
}
