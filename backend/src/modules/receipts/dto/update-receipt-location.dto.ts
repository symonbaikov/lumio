import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** The OpenStreetMap place the user picked from the list of places nearby. */
export class ReceiptPlaceDto {
  @ApiProperty({ example: 'Carrefour' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'shop', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string | null;

  @ApiProperty({ enum: ['node', 'way', 'relation'] })
  @IsIn(['node', 'way', 'relation'])
  osmType: string;

  @ApiProperty({ example: '274497719' })
  @Matches(/^\d{1,20}$/)
  osmId: string;
}

export class UpdateReceiptLocationDto {
  @ApiProperty({ example: 43.2383, minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 76.9453, minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ type: ReceiptPlaceDto, description: 'Set when a nearby shop was picked' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReceiptPlaceDto)
  place?: ReceiptPlaceDto;
}
