import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { GoalItemStatus } from '../../../entities/goal-item.entity';

export class CreateGoalItemDto {
  @IsString()
  @Length(1, 150)
  name: string;

  @IsNumber()
  @Min(0)
  estimatedAmount: number;

  /** What it really cost. Omitted while the line is still only a plan. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualAmount?: number | null;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  /** `YYYY-MM`, the month the money is expected to leave. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'dueMonth must be in YYYY-MM format' })
  dueMonth?: string | null;

  @IsOptional()
  @IsEnum(GoalItemStatus)
  status?: GoalItemStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}
