import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class MarkPayablePaidDto {
  /** An existing transaction that settled the bill. */
  @IsOptional()
  @IsUUID()
  linkedTransactionId?: string;

  /** Paid in cash: record the payment as a new transaction of this wallet. */
  @IsOptional()
  @IsUUID()
  payFromWalletId?: string;

  /** Day of the cash payment; today when omitted. */
  @IsOptional()
  @IsDateString()
  paidOn?: string;

  /** Category of the cash payment's transaction. */
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
