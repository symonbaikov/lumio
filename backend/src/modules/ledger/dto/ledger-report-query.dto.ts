import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { toBooleanValue } from '../../../common/dto/query-transformers';

const DATE_ONLY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

class StaleOptionDto {
  /**
   * Build the report while transactions are still waiting to be booked. The
   * response says how many in `freshness`; without this flag it is refused.
   */
  @IsOptional()
  @Transform(toBooleanValue)
  @IsBoolean()
  allowStale?: boolean;
}

/** A period; defaults to the start of the year of `dateTo` through today. */
export class LedgerPeriodQueryDto extends StaleOptionDto {
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY, { message: 'dateFrom must be YYYY-MM-DD' })
  dateFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY, { message: 'dateTo must be YYYY-MM-DD' })
  dateTo?: string;
}

export class LedgerDateQueryDto extends StaleOptionDto {
  /** Balance as at the end of this day; defaults to today. */
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY, { message: 'date must be YYYY-MM-DD' })
  date?: string;
}

export class AccountLedgerQueryDto extends LedgerPeriodQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
