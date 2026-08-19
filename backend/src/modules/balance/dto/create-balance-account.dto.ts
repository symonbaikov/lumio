import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateBalanceAccountDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  nameKk?: string;

  @IsUUID()
  parentId: string;
}
