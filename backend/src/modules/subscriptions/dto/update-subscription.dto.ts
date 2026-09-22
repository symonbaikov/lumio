import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { SubscriptionFrequency, SubscriptionStatus } from '../../../entities/subscription.entity';
import { VENDOR_DOMAIN_PATTERN } from '../../vendor-icons/vendor-domain.util';

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

  // Normalised so a hand-typed "Netflix.COM " still matches the pattern.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @MaxLength(253)
  @Matches(VENDOR_DOMAIN_PATTERN, { message: 'vendorDomain must be a domain name' })
  vendorDomain?: string;
}
