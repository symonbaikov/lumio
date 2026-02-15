import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum BalanceExportFormat {
  EXCEL = 'excel',
  PDF = 'pdf',
}

export class ExportBalanceDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsEnum(BalanceExportFormat)
  format: BalanceExportFormat = BalanceExportFormat.EXCEL;
}
