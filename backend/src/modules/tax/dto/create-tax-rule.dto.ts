import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { TaxRuleDirection } from '../../../entities/tax-rule.entity';

export class CreateTaxRuleDto {
  /** Omit for a catch-all rule covering its whole direction. */
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  /** Stable rate code, e.g. 'KZ_STANDARD'. Resolved per transaction date. */
  @IsString()
  @Length(1, 40)
  taxRateCode: string;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsEnum(TaxRuleDirection)
  @IsOptional()
  direction?: TaxRuleDirection;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
