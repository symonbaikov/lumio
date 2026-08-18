import { IsIn, IsOptional } from 'class-validator';

export const NET_WORTH_RANGES = ['30d', '90d', '1y', '5y', 'all'] as const;

export type NetWorthRange = (typeof NET_WORTH_RANGES)[number];

export class NetWorthQueryDto {
  @IsOptional()
  @IsIn(NET_WORTH_RANGES)
  range?: NetWorthRange;
}
