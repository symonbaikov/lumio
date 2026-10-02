import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { BalanceAccountKind } from '../../../entities/balance-account.entity';

export class CreateInvestmentAccountDto {
  @IsString()
  @Length(1, 255)
  name: string;

  /** Investment (brokerage, ISA, ETF savings plan) or retirement (pension, 401k, IRA). */
  @IsEnum(BalanceAccountKind)
  @IsOptional()
  kind?: BalanceAccountKind;
}
