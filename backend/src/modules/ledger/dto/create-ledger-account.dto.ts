import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { LedgerAccountType } from '../../../entities/ledger-account.entity';

export class CreateLedgerAccountDto {
  /** Unique within the workspace; stored upper-cased. */
  @IsString()
  @Length(1, 40)
  @Matches(/^[A-Za-z0-9_.-]+$/, {
    message: 'code may contain only letters, digits, "_", "." and "-"',
  })
  code: string;

  @IsString()
  @Length(1, 255)
  name: string;

  @IsEnum(LedgerAccountType)
  accountType: LedgerAccountType;

  /** A section header (non-postable account) of the same type. */
  @IsOptional()
  @IsUUID()
  parentId?: string;

  /** Restricts the account to lines in this currency, as for a bank account. */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, { message: 'currency must be a 3-letter ISO code' })
  currency?: string;

  /** False creates a section header that groups accounts and carries no lines. */
  @IsOptional()
  @IsBoolean()
  isPostable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
