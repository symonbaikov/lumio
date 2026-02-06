import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { CategoryType } from '../../../entities/category.entity';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsEnum(CategoryType)
  type: CategoryType;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
