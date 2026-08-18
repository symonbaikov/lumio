import { IsEnum, IsOptional } from 'class-validator';
import { CapitalRole, RiskLevel } from '../../../entities/balance-account.entity';

export class UpdateAccountClassificationDto {
  /** Null clears the classification back to "not classified". */
  @IsOptional()
  @IsEnum(CapitalRole)
  capitalRole?: CapitalRole | null;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel | null;
}
