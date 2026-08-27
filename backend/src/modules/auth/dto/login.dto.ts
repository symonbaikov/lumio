import { IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  /** TOTP code or recovery code, required only when the account has 2FA enabled. */
  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}
