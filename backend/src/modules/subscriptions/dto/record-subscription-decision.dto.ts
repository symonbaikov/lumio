import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { SubscriptionDecisionType } from '../../../entities/subscription-decision.entity';

export class RecordSubscriptionDecisionDto {
  @IsEnum(SubscriptionDecisionType)
  decision: SubscriptionDecisionType;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  reviewAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  realizedAnnualSavings?: number;
}
