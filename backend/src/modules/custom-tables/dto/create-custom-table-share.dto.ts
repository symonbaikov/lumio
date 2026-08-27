import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateCustomTableShareDto {
  /** Срок жизни ссылки в днях; по умолчанию 30, максимум год. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;
}
