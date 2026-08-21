import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ReportScheduleCadence } from '../../../entities/report-schedule.entity';

export class CreateReportScheduleDto {
  @IsString()
  templateId: string;

  @IsIn(['pdf', 'excel', 'csv'])
  format: string;

  @IsEnum(ReportScheduleCadence)
  cadence: ReportScheduleCadence;

  /** Capped so a schedule cannot be turned into a bulk mailer. */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @IsEmail({}, { each: true })
  recipients: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  walletIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  groupBy?: 'day' | 'week' | 'month';

  @IsOptional()
  @IsIn(['ru', 'en', 'kk'])
  locale?: string;
}

export class UpdateReportScheduleActiveDto {
  @IsBoolean()
  isActive: boolean;
}
