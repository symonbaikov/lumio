import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { BudgetPeriodType } from '../../../entities/budget.entity';

export class CreateBudgetDto {
  @IsString()
  name: string;

  @IsUUID()
  categoryId: string;

  @IsNumber()
  @Min(0)
  limitAmount: number;

  @IsEnum(BudgetPeriodType)
  periodType: BudgetPeriodType;

  @IsString()
  @IsOptional()
  currency?: string;
}
