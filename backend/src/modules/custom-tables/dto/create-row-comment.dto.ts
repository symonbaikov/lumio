import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRowCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;
}

export class SetCommentResolvedDto {
  @IsBoolean()
  resolved: boolean;
}
