import { IsOptional, IsString, Matches } from 'class-validator';

export class GoalFlowQueryDto {
  /** Calendar month to read, `YYYY-MM`. Defaults to the current month. */
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be in YYYY-MM format' })
  @IsOptional()
  month?: string;
}
