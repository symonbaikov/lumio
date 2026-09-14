import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DateFormatPreference, ThemePreference, UiDensity } from '@/entities/user.entity';

/** A photo bundled with the frontend, e.g. /workspace-backgrounds/lightscape-LtnPejWDSAY-unsplash.jpg. */
const PRESET_BACKGROUND_PATTERN = /^\/workspace-backgrounds\/[A-Za-z0-9_-]+\.jpg$/;

export enum AppLocale {
  RU = 'ru',
  EN = 'en',
  KK = 'kk',
}

export class UpdateMyPreferencesDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(AppLocale)
  locale?: AppLocale;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string | null;

  @IsOptional()
  @IsEnum(ThemePreference)
  themePreference?: ThemePreference;

  @IsOptional()
  @IsEnum(DateFormatPreference)
  dateFormat?: DateFormatPreference;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  firstDayOfWeek?: number | null;

  @IsOptional()
  @IsEnum(UiDensity)
  uiDensity?: UiDensity;

  @IsOptional()
  @IsBoolean()
  reduceMotion?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  mapStylePreference?: string | null;

  /**
   * A bundled photo, or null to clear. Uploads go through
   * POST /users/me/content-background, so no other URL is accepted here.
   */
  @IsOptional()
  @Matches(PRESET_BACKGROUND_PATTERN)
  contentBackground?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  contentBackgroundDim?: number;
}
