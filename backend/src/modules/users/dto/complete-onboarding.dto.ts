import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AppLocale } from './update-my-preferences.dto';

export class CompleteOnboardingDto {
  @IsOptional()
  @IsEnum(AppLocale)
  locale?: AppLocale;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  workspaceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  workspaceCurrency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  workspaceBackgroundImage?: string;
}
