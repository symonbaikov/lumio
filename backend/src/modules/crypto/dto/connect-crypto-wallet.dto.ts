import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { SUPPORTED_CHAIN_IDS } from '../crypto.constants';

export class ConnectCryptoWalletDto {
  /** A public EVM address. Checked here so a typo fails at the edge, not mid-sync. */
  @IsString()
  @Matches(/^0x[0-9a-fA-F]{40}$/, { message: 'address must be a valid EVM address' })
  address: string;

  @IsOptional()
  @IsIn(SUPPORTED_CHAIN_IDS)
  chainId?: number;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  label?: string;
}
