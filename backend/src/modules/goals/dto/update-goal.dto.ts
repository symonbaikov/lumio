import { IsDateString, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  @Length(1, 150)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  targetAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  /** Explicit null clears the deadline; omitting the field leaves it alone. */
  @IsOptional()
  @IsDateString()
  targetDate?: string | null;
}
