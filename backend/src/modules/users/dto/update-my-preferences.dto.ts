import { DateFormatPreference, ThemePreference, UiDensity } from '@/entities/user.entity';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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
}
