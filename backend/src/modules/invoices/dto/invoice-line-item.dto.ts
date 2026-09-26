import { IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class InvoiceLineItemDto {
  @IsString()
  @MinLength(1)
  description: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsUUID()
  taxRateId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
