import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { toNumberValue } from '../../../common/dto/query-transformers';
import { InvoiceStatus } from '../../../entities/invoice.entity';

export class FilterInvoicesDto {
  @IsOptional()
  @Transform(toNumberValue)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(toNumberValue)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsUUID()
  clientId?: string;
}
