import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CUSTOM_TABLE_AGGREGATE_FNS } from './list-custom-table-rows.dto';

export class CustomTableSavedViewSortDto {
  @IsString()
  @MinLength(1)
  col: string;

  @IsIn(['asc', 'desc'])
  dir: 'asc' | 'desc';
}

export class CustomTableSavedViewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  id: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  /** Состояние панели фильтров: ключ колонки -> условие. */
  @IsOptional()
  @IsObject()
  columnFilters?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomTableSavedViewSortDto)
  sort?: CustomTableSavedViewSortDto | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  columnOrder?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  hiddenColumnKeys?: string[];

  /** Ключ колонки -> функция итога. */
  @IsOptional()
  @IsObject()
  aggregates?: Record<string, (typeof CUSTOM_TABLE_AGGREGATE_FNS)[number]>;
}

export class UpdateCustomTableViewsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CustomTableSavedViewDto)
  views: CustomTableSavedViewDto[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  activeViewId?: string | null;
}

export class UpdateCustomTableRulesDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsObject({ each: true })
  rules: Record<string, unknown>[];
}
