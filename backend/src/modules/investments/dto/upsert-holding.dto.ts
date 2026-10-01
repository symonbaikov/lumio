import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { InvestmentAssetClass } from '../../../entities/investment-holding.entity';

export class UpsertHoldingDto {
  /** Ticker for automatic prices (AAPL, VWCE.DE, BTC); omit for a manual line. */
  @IsString()
  @Length(1, 32)
  @IsOptional()
  symbol?: string | null;

  @IsString()
  @Length(1, 255)
  @IsOptional()
  name?: string;

  @IsEnum(InvestmentAssetClass)
  @IsOptional()
  assetClass?: InvestmentAssetClass;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  /** A hand-entered price; omitted, the last fetched or entered one stays. */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @Length(3, 10)
  @IsOptional()
  priceCurrency?: string;
}
