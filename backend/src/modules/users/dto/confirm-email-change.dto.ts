import { IsString } from 'class-validator';

export class ConfirmEmailChangeDto {
  @IsString()
  token: string;
}
