import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const QUERY_MAX_LENGTH = 500;

export class SearchTransactionsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(QUERY_MAX_LENGTH)
  query: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  limit?: number;
}

export class BackfillEmbeddingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  batchSize?: number;
}
