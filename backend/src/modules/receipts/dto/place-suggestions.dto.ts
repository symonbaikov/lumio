import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

/** A GPS fix taken after the receipt was photographed without one. */
export class PlaceSuggestionsDto {
  @ApiProperty({ description: 'Statement created by the receipt scan upload' })
  @IsUUID()
  statementId: string;

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

  @ApiPropertyOptional({ description: 'Accuracy radius in metres', example: 25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  accuracy?: number;
}
