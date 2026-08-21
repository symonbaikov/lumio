import { IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class GenerateReportDto {
  @IsString()
  templateId: string;

  @IsDateString()
  dateFrom: string;

  @IsDateString()
  dateTo: string;

  @IsIn(['pdf', 'excel', 'csv'])
  format: string;

  /** Restrict to these wallets; empty or omitted means all of them. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  walletIds?: string[];

  /** Restrict to these categories; empty or omitted means all of them. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  /** Only Cash Flow uses this; defaults to daily buckets. */
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  groupBy?: 'day' | 'week' | 'month';

  /** Only Balance Sheet uses this, to localize account names. */
  @IsOptional()
  @IsString()
  @IsIn(['ru', 'en', 'kk'])
  locale?: string;
}
