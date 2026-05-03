import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUrl, Length } from 'class-validator';
import { WebhookEvent } from '../../../entities/webhook-subscription.entity';

export class CreateWebhookSubscriptionDto {
  @ApiProperty()
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty()
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'HMAC secret, min 16 chars' })
  @IsString()
  @Length(16, 255)
  secret: string;

  @ApiProperty({ enum: WebhookEvent, isArray: true })
  @IsArray()
  @IsEnum(WebhookEvent, { each: true })
  events: WebhookEvent[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
