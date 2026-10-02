import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';

class PushKeysDto {
  @IsString()
  @MaxLength(255)
  p256dh: string;

  @IsString()
  @MaxLength(255)
  auth: string;
}

/** The object `PushManager.subscribe()` hands the page, as JSON. */
export class PushSubscriptionDto {
  @IsUrl({ protocols: ['https'], require_tld: false })
  endpoint: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  userAgent?: string;
}

export class PushUnsubscribeDto {
  @IsString()
  endpoint: string;
}
