import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'My MCP Agent' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '2027-01-01T00:00:00Z', required: false })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}
