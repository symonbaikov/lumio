import { IsString, MinLength } from 'class-validator';

export class DeleteAccountDto {
  /** Re-entered so a hijacked session cannot delete the account. */
  @IsString()
  @MinLength(1)
  password: string;
}
