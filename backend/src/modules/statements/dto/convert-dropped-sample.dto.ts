import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ConvertDroppedSampleTransactionDto {
  @IsDateString()
  transactionDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  debit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  credit?: number;

  @IsOptional()
  @IsString()
  counterpartyName?: string;

  @IsOptional()
  @IsString()
  paymentPurpose?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  counterpartyBin?: string;

  @IsOptional()
  @IsString()
  counterpartyAccount?: string;

  @IsOptional()
  @IsString()
  counterpartyBank?: string;

  @IsOptional()
  @IsString()
  article?: string;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  walletId?: string;
}

export class ConvertDroppedSampleDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  index: number;

  @IsOptional()
  @IsString()
  warning?: string;

  @ValidateNested()
  @Type(() => ConvertDroppedSampleTransactionDto)
  transaction: ConvertDroppedSampleTransactionDto;
}
