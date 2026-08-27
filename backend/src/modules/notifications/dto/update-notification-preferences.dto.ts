import { IsBoolean, IsEnum, IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';
import { NotificationDigestMode } from '../../../entities/notification-preference.entity';

export type NotificationChannelSetDto = {
  inApp?: boolean;
  email?: boolean;
  telegram?: boolean;
};

export class UpdateNotificationPreferencesDto {
  /**
   * Per-event channel matrix, keyed by preference key (e.g. `statementUploaded`).
   * class-validator cannot walk a Record, so the service normalises it against the
   * known keys instead of trusting whatever JSON arrives.
   */
  @IsOptional()
  @IsObject()
  channels?: Record<string, NotificationChannelSetDto>;

  @IsOptional()
  @IsEnum(NotificationDigestMode)
  digestMode?: NotificationDigestMode;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  quietHoursStart?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  quietHoursEnd?: number | null;

  @IsOptional()
  @IsBoolean()
  statementUploaded?: boolean;

  @IsOptional()
  @IsBoolean()
  importCommitted?: boolean;

  @IsOptional()
  @IsBoolean()
  categoryChanges?: boolean;

  @IsOptional()
  @IsBoolean()
  memberActivity?: boolean;

  @IsOptional()
  @IsBoolean()
  dataDeleted?: boolean;

  @IsOptional()
  @IsBoolean()
  workspaceUpdated?: boolean;

  @IsOptional()
  @IsBoolean()
  parsingErrors?: boolean;

  @IsOptional()
  @IsBoolean()
  importFailures?: boolean;

  @IsOptional()
  @IsBoolean()
  uncategorizedItems?: boolean;
}
