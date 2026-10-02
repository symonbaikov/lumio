import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/** "If I book this expense now, what does it do to my budgets and my account?" */
export class BudgetImpactQueryDto {
  @IsUUID()
  categoryId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  /** `YYYY-MM-DD`; defaults to today. */
  @IsDateString()
  @IsOptional()
  date?: string;
}
