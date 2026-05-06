import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { SubscriptionFrequency, SubscriptionStatus } from '../../../entities/subscription.entity';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  vendorName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsEnum(SubscriptionFrequency)
  frequency?: SubscriptionFrequency;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  nextChargeDate?: string;
}
