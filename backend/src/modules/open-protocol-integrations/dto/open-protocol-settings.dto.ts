import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * These bodies were typed `Record<string, unknown>`, which leaves the global
 * ValidationPipe with an `Object` metatype and therefore nothing to validate —
 * `whitelist` and `forbidNonWhitelisted` both become no-ops. The controller's
 * own stringValue/numberValue coercion stays: it decides the shape handed to
 * the service, while these DTOs reject unknown properties at the boundary.
 */

export class SaveS3SettingsDto {
  @IsOptional()
  @IsString()
  endpoint?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  bucket?: string;

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsString()
  accessKeyId?: string;

  @IsOptional()
  @IsString()
  secretAccessKey?: string;

  @IsOptional()
  @IsBoolean()
  forcePathStyle?: boolean;

  @IsOptional()
  @IsBoolean()
  autoBackup?: boolean;
}

export class SaveWebdavSettingsDto {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  rootPath?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

export class SaveImapSettingsDto {
  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  @IsOptional()
  @IsString()
  mailbox?: string;

  @IsOptional()
  @IsString()
  user?: string;

  @IsOptional()
  @IsString()
  pass?: string;
}

export class ListImapFoldersDto {
  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  @IsOptional()
  @IsString()
  user?: string;

  @IsOptional()
  @IsString()
  pass?: string;
}

export class ImportFilesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileIds?: string[];
}
