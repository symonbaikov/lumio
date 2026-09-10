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

/**
 * Every field optional: the common edit is one of them (a deposit turned out to
 * cost more, a date moved). Explicit null on `actualAmount` or `dueMonth` clears
 * it; omitting the field leaves it alone.
 */
export class UpdateGoalItemDto {
  @IsOptional()
  @IsString()
  @Length(1, 150)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualAmount?: number | null;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

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
