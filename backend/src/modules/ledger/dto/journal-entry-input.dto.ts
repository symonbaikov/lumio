import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** Lines per entry. `line_no` is a smallint; a real entry has a handful. */
export const MAX_JOURNAL_LINES = 200;

const DATE_ONLY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export class JournalLineInputDto {
  @IsUUID()
  accountId: string;

  @IsIn(['debit', 'credit'])
  side: 'debit' | 'credit';

  /**
   * Positive decimal with up to two places, as a string: amounts never pass
   * through a float on the way in. Zero is refused by the service.
   */
  @IsString()
  @Matches(/^\d{1,13}(\.\d{1,2})?$/, {
    message: 'amount must be a positive decimal with up to 2 places',
  })
  amount: string;

  /** Defaults to the ledger's base currency. */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, { message: 'currency must be a 3-letter ISO code' })
  currency?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsUUID()
  branchId?: string | null;
}

export class CreateJournalEntryDto {
  @IsString()
  @Matches(DATE_ONLY, { message: 'entryDate must be YYYY-MM-DD' })
  entryDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string | null;

  /** A draft may hold any number of lines, balanced or not; posting needs two that balance. */
  @IsArray()
  @ArrayMaxSize(MAX_JOURNAL_LINES)
  @ValidateNested({ each: true })
  @Type(() => JournalLineInputDto)
  lines: JournalLineInputDto[];
}

/** Every field optional; `lines`, when given, replaces all of the draft's lines. */
export class UpdateJournalEntryDto {
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY, { message: 'entryDate must be YYYY-MM-DD' })
  entryDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_JOURNAL_LINES)
  @ValidateNested({ each: true })
  @Type(() => JournalLineInputDto)
  lines?: JournalLineInputDto[];
}

export class ReverseJournalEntryDto {
  /** Defaults to today: a correction belongs to the period it is made in. */
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY, { message: 'date must be YYYY-MM-DD' })
  date?: string;
}
