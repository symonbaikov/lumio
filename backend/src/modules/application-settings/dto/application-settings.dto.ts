import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * These bodies used to be typed `Record<string, unknown>`, which makes the
 * global ValidationPipe a no-op: with an `Object` metatype there is nothing for
 * `whitelist`/`forbidNonWhitelisted` to check against, so unknown properties
 * flowed through untouched.
 *
 * The service still coerces every field it reads (requiredString, positiveNumber
 * and friends) and builds its config objects from named fields, so this is the
 * boundary check those helpers never replaced — it rejects unknown properties
 * and returns a proper 400 instead of surfacing a coercion error later.
 */

export class SaveAiSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsString()
  baseUrl: string;

  @IsString()
  model: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timeoutMs?: number;
}

export class SaveLocalCategorizationDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;

  @IsOptional()
  @IsString()
  localModelPath?: string;
}

export class TestLocalCategorizationDto {
  @IsString()
  merchantName: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}

export class SaveSmtpSettingsDto {
  @IsString()
  host: string;

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

  @IsString()
  from: string;

  @IsOptional()
  @IsString()
  replyTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timeoutMs?: number;
}

export class SaveTelegramSettingsDto {
  @IsOptional()
  @IsString()
  botToken?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timeoutMs?: number;
}

export class SaveAppSettingsDto {
  @IsString()
  publicUrl: string;
}
