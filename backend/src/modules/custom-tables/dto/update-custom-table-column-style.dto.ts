import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, Matches, ValidateNested } from 'class-validator';

// #rrggbb или #rrggbbaa: заливка колонки хранится с прозрачностью, чтобы
// ложиться на обе темы.
const HEX_COLOR = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

class ColumnStyleTextFormatDto {
  @IsOptional()
  @Matches(HEX_COLOR)
  foregroundColor?: string;

  @IsOptional()
  @IsBoolean()
  bold?: boolean;
}

export class ColumnStylePartDto {
  @IsOptional()
  @Matches(HEX_COLOR)
  backgroundColor?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ColumnStyleTextFormatDto)
  textFormat?: ColumnStyleTextFormatDto;
}

/** Части, которых нет в теле, не меняются; null сбрасывает часть. */
export class UpdateCustomTableColumnStyleDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ColumnStylePartDto)
  header?: ColumnStylePartDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ColumnStylePartDto)
  cell?: ColumnStylePartDto | null;
}
