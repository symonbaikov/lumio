import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  CUSTOM_TABLE_AGGREGATE_FNS,
  type CustomTableAggregateFn,
} from './list-custom-table-rows.dto';

export class UpdateCustomTableViewSettingsColumnDto {
  @IsString()
  columnKey: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(1200)
  width?: number;

  /** Функция итога для колонки; null снимает итог. */
  @IsOptional()
  @IsIn([...CUSTOM_TABLE_AGGREGATE_FNS, null])
  aggregate?: CustomTableAggregateFn | null;
}
