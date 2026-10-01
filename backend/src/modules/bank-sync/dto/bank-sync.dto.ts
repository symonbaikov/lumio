import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class ConnectBankSyncDto {
  /** The one-time token SimpleFIN Bridge shows after "New connection". */
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  setupToken: string;
}

export class BankSyncAccountSettingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  id: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /** The wallet the pulled rows land in; null detaches. */
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsUUID()
  walletId?: string | null;
}

export class UpdateBankSyncSettingsDto {
  @IsOptional()
  @IsBoolean()
  autoSync?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BankSyncAccountSettingDto)
  accounts?: BankSyncAccountSettingDto[];
}
