import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class WebhookTransactionCreateDto {
  @ApiProperty({ example: 1250.00 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'KZT' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  transactionDate: string;

  @ApiProperty({ example: 'Coffee Shop LLC' })
  @IsString()
  @IsNotEmpty()
  counterpartyName: string;

  @ApiPropertyOptional({ example: 'Office supplies' })
  @IsString()
  @IsOptional()
  paymentPurpose?: string;

  @ApiProperty({ example: 'expense', description: 'income | expense | transfer' })
  @IsString()
  @IsNotEmpty()
  transactionType: string;

  @ApiPropertyOptional({ description: 'Category UUID' })
  @IsString()
  @IsOptional()
  categoryId?: string;
}
