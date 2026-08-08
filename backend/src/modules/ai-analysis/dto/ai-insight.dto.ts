import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

const TITLE_MAX_LENGTH = 255;
const MESSAGE_MAX_LENGTH = 4000;

export class SaveAiInsightDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX_LENGTH)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MESSAGE_MAX_LENGTH)
  message: string;

  /**
   * Period the summary covers, e.g. `2026-08`. Constrained so it cannot be used
   * to mint unlimited distinct deduplication keys and fill the insights table.
   */
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'periodKey must look like 2026-08' })
  periodKey: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  modelId: string;
}
