import { Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export const FORECAST_HORIZONS = [30, 90, 365] as const;

export class ForecastQueryDto {
  @Type(() => Number)
  @IsIn(FORECAST_HORIZONS as unknown as number[])
  @IsOptional()
  days?: number;

  /** Source ids to leave out: "what if I cancel X". Comma-separated. */
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
      : String(value ?? '')
          .split(',')
          .map(part => part.trim())
          .filter(Boolean),
  )
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  exclude?: string[];

  /** Multiplier on inflows: 0.8 = income down 20%. */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  incomeFactor?: number;

  /** Multiplier on outflows and the everyday average. */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  expenseFactor?: number;
}
