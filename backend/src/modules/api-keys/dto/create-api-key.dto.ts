import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { GRANTABLE_SCOPES } from '../api-key-scopes';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'My MCP Agent' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '2027-01-01T00:00:00Z', required: false })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  /** Permission strings the key is limited to; e.g. ['transaction.view', 'report.view']. Required for new keys. */
  @ApiProperty({ example: ['transaction.view', 'report.view'] })
  @IsArray()
  @ArrayUnique()
  @IsIn(GRANTABLE_SCOPES, { each: true })
  scopes: string[];
}
