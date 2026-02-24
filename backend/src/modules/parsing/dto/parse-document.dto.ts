import { IsOptional, IsString } from 'class-validator';

export class ParseDocumentDto {
  @IsOptional()
  @IsString()
  sender?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  emailBody?: string;

  @IsOptional()
  @IsString()
  source?: 'upload' | 'scan' | 'telegram' | 'gmail';
}
