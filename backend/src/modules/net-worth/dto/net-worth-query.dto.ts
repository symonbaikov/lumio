import { IsIn, IsOptional } from 'class-validator';
import { InvestmentMetal } from '../../../entities/investment-holding.entity';

export const NET_WORTH_RANGES = ['30d', '90d', '180d', 'ytd', '1y', '3y', '5y', 'all'] as const;

export type NetWorthRange = (typeof NET_WORTH_RANGES)[number];

const METALS = Object.values(InvestmentMetal);

export class NetWorthQueryDto {
  @IsOptional()
  @IsIn(NET_WORTH_RANGES)
  range?: NetWorthRange;

  /** Measure the same net worth in troy ounces of this metal as well. */
  @IsOptional()
  @IsIn(METALS)
  denominate?: InvestmentMetal;
}
