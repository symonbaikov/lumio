import { IsDateString, IsOptional } from 'class-validator';

export class BalanceQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
