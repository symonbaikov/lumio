import { IsUUID } from 'class-validator';

export class ConfirmReconciliationDto {
  @IsUUID()
  payableId: string;

  @IsUUID()
  transactionId: string;
}
