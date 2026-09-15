import { IsIn, IsOptional, Matches } from 'class-validator';
import { CASH_FLOW_RANGES, type CashFlowRange } from '../dashboard-window.util';

export class CashFlowQueryDto {
  @IsOptional()
  @IsIn(CASH_FLOW_RANGES)
  range?: CashFlowRange;

  /** The month every range ends at (YYYY-MM); the current month when omitted. */
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be YYYY-MM' })
  month?: string;
}
