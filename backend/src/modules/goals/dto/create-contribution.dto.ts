import { IsDateString, IsNumber, IsOptional, IsString, Length } from 'class-validator';

export class CreateContributionDto {
  /** Negative withdraws from the goal — corrections are new rows, not edits. */
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsDateString()
  contributionDate?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  note?: string;
}
