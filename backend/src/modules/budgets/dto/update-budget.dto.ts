import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

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

  /** Explicit null detaches the budget from its goal; omitting it changes nothing. */
  @IsUUID()
  @IsOptional()
  goalId?: string | null;

  /** Explicit null makes the budget open-ended again; omitting it changes nothing. */
  @IsDateString()
  @IsOptional()
  startsOn?: string | null;

  @IsDateString()
  @IsOptional()
  endsOn?: string | null;
}
