import { IsString, Length, MinLength } from 'class-validator';

export class TwoFactorPasswordDto {
  @IsString()
  @MinLength(1)
  password: string;
}

export class TwoFactorCodeDto {
  @IsString()
  @Length(6, 6)
  code: string;
}
