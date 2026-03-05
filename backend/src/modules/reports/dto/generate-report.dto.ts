import { IsDateString, IsIn, IsString } from 'class-validator';

export class GenerateReportDto {
  @IsString()
  templateId: string;

  @IsDateString()
  dateFrom: string;

  @IsDateString()
  dateTo: string;

  @IsIn(['pdf', 'excel', 'csv'])
  format: string;
}
