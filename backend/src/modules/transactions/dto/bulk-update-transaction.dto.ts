import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { UpdateTransactionDto } from './update-transaction.dto';

export class BulkUpdateItemDto {
  @IsString()
  id: string;

  @ValidateNested()
  @Type(() => UpdateTransactionDto)
  updates: UpdateTransactionDto;
}

export class BulkUpdateTransactionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  items: BulkUpdateItemDto[];
}

/**
 * The endpoint accepts two shapes: the current `{items}` and the legacy
 * `{ids, updates}`. A union type on the `@Body()` gave the global
 * ValidationPipe an `Object` metatype and turned validation off entirely, so
 * both shapes are modelled here as optional fields and the handler picks one.
 */
export class BulkUpdateRequestDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  items?: BulkUpdateItemDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTransactionDto)
  updates?: UpdateTransactionDto;
}
