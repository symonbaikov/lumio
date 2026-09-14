import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsUUID, ValidateNested } from 'class-validator';

/**
 * Inline structural types on a `@Body()` give the global ValidationPipe an
 * `Object` metatype, which makes it a no-op — these ids reached the service
 * unchecked.
 */
export class DuplicateGroupDto {
  @IsUUID('4')
  masterId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  duplicateIds: string[];
}

export class MarkDuplicatesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DuplicateGroupDto)
  groups: DuplicateGroupDto[];
}

export class MergeDuplicatesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  transactionIds: string[];
}
