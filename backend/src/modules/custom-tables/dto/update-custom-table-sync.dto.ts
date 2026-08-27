import { IsBoolean, IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';

export class UpdateCustomTableSyncDto {
  @IsOptional()
  @IsBoolean()
  syncEnabled?: boolean;

  /** Реже раза в час смысла нет, чаще суток в неделю — тоже. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  syncIntervalHours?: number;

  /** { googleSheetId, worksheetName, range } */
  @IsOptional()
  @IsObject()
  syncConfig?: Record<string, unknown> | null;
}
