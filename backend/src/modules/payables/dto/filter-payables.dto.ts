import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { toBooleanValue, toNumberValue } from '../../../common/dto/query-transformers';
import { PayableDirection, PayableSource, PayableStatus } from '../../../entities/payable.entity';

export enum ExportFormat {
  EXCEL = 'excel',
  CSV = 'csv',
}

export enum PayablesSortOption {
  DUE_DATE_ASC = 'dueDateAsc',
  DUE_DATE_DESC = 'dueDateDesc',
  AMOUNT_DESC = 'amountDesc',
  VENDOR_ASC = 'vendorAsc',
}

export class FilterPayablesDto {
  /** Defaults to `payable` so existing clients keep seeing only what the workspace owes. */
  @IsOptional()
  @IsEnum(PayableDirection)
  direction?: PayableDirection;

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
  @IsEnum(PayableStatus)
  status?: PayableStatus;

  @IsOptional()
  @IsEnum(PayableSource)
  source?: PayableSource;

  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @IsOptional()
  @Transform(toNumberValue)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @Transform(toNumberValue)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @Transform(toBooleanValue)
  @IsBoolean()
  includeArchived?: boolean;

  @IsOptional()
  @IsEnum(PayablesSortOption)
  sort?: PayablesSortOption;

  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;
}
