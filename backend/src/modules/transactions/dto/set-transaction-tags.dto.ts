import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class SetTransactionTagsDto {
  /** The complete desired tag set for the transaction; an empty array clears it. */
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  tagIds: string[];
}
