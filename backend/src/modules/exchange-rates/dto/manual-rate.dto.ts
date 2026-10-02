import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, Length } from 'class-validator';

/** A rate entered by hand; it wins over provider rates for that day. */
export class ManualRateDto {
  @IsString()
  @Length(3, 3)
  from: string;

  @IsString()
  @Length(3, 3)
  to: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  rate: number;

  /** YYYY-MM-DD; today when omitted. */
  @IsOptional()
  @IsDateString()
  date?: string;
}
