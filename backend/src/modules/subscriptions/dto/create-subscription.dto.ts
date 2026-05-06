import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { SubscriptionFrequency } from '../../../entities/subscription.entity';

export class CreateSubscriptionDto {
  @IsString()
  vendorName: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(SubscriptionFrequency)
  frequency: SubscriptionFrequency;

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
