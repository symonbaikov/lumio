import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class ApproveReceiptDto {
  /**
   * The bank row to attach the receipt to. Omitted: the stored suggestion is
   * used when there is one. `null`: book a new transaction regardless.
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4')
  transactionId?: string | null;
}
