import { IsEnum, IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';
import { ExportScheduleFormat } from '../../../entities/custom-table-export-schedule.entity';

export class CreateExportScheduleDto {
  @IsOptional()
  @IsEnum(ExportScheduleFormat)
  format?: ExportScheduleFormat;

  /** От часа до месяца: чаще смысла нет, реже — уже не расписание. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(744)
  intervalHours?: number;

  /** { filters, sort, columnKeys } — тот же «текущий вид», что у ручного экспорта. */
  @IsOptional()
  @IsObject()
  viewConfig?: Record<string, unknown> | null;
}
