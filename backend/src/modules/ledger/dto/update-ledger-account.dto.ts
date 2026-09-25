import { IsInt, IsOptional, IsString, IsUUID, Length, Matches, Min } from 'class-validator';

/**
 * Type, currency and postability are fixed at creation: journal lines already
 * booked against the account depend on all three.
 */
export class UpdateLedgerAccountDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  @Matches(/^[A-Za-z0-9_.-]+$/, {
    message: 'code may contain only letters, digits, "_", "." and "-"',
  })
  code?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  /** Null moves the account to the top level. */
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
