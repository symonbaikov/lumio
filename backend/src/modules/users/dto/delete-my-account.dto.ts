import { IsString, MinLength } from 'class-validator';

export class DeleteMyAccountDto {
  /** Re-authentication: a stolen access token alone must not be able to delete an account. */
  @IsString()
  @MinLength(1)
  currentPassword: string;
}
