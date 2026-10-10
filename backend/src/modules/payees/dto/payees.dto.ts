import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PayeeMode } from '../../../entities/payee.entity';

export class PayeesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class UpdatePayeeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEnum(PayeeMode)
  mode?: PayeeMode;

  /** The pinned category; required with `mode: always`, null clears it. */
  @IsOptional()
  @ValidateIf((_dto, value) => value !== null)
  @IsUUID()
  categoryId?: string | null;
}

export class MergePayeesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  sourceIds: string[];
}

/** Either an existing payee, or a name to find or create one by. */
export class SetTransactionPayeeDto {
  @ValidateIf(dto => !dto.name)
  @IsUUID()
  payeeId?: string;

  @ValidateIf(dto => !dto.payeeId)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;
}
