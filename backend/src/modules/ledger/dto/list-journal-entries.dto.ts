import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';
import { JournalEntrySource, JournalEntryStatus } from '../../../entities/journal-entry.entity';

const DATE_ONLY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export class ListJournalEntriesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(JournalEntryStatus)
  status?: JournalEntryStatus;

  @IsOptional()
  @IsEnum(JournalEntrySource)
  source?: JournalEntrySource;

  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY, { message: 'dateFrom must be YYYY-MM-DD' })
  dateFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY, { message: 'dateTo must be YYYY-MM-DD' })
  dateTo?: string;

  /** Only entries with a line on this account. */
  @IsOptional()
  @IsUUID()
  accountId?: string;
}
