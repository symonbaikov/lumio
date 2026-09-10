import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
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

  /** The goal this budget serves. Omitted or null leaves it unattached. */
  @IsUUID()
  @IsOptional()
  goalId?: string | null;

  /**
   * The window the budget applies in, `YYYY-MM-DD`. Both omitted — the norm —
   * means it runs forever, which is how budgets behaved before these existed.
   */
  @IsDateString()
  @IsOptional()
  startsOn?: string | null;

  @IsDateString()
  @IsOptional()
  endsOn?: string | null;
}
