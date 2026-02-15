import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
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
