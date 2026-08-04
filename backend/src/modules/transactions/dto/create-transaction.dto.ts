import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTransactionDto {
  @IsUUID()
  statementId: string;

  @IsDateString()
  transactionDate: Date;

  @IsString()
  @IsNotEmpty()
  counterpartyName: string;

  @IsString()
  @IsNotEmpty()
  paymentPurpose: string;

  @IsNumber()
  @IsOptional()
  debit?: number;

  @IsNumber()
  @IsOptional()
  credit?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsUUID()
  @IsOptional()
  walletId?: string;

  @IsString()
  @IsOptional()
  comments?: string;
}
