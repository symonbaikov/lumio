import { IsDateString, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @Length(1, 150)
  name: string;

  @IsNumber()
  @Min(0.01)
  targetAmount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;
}
