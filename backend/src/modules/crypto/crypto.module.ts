import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoWallet } from '../../entities/crypto-wallet.entity';
import { ExchangeRate } from '../../entities/exchange-rate.entity';
import { Transaction } from '../../entities/transaction.entity';
import { Workspace } from '../../entities/workspace.entity';
import { AuditModule } from '../audit/audit.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { BitcoinClient } from './bitcoin.client';
import { CryptoController } from './crypto.controller';
import { CryptoService } from './crypto.service';
import { CryptoPriceService } from './crypto-price.service';
import { CryptoSyncService } from './crypto-sync.service';
import { SolanaRpcClient } from './solana-rpc.client';
import { TronGridClient } from './tron-grid.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([CryptoWallet, Transaction, Workspace, ExchangeRate]),
    AuditModule,
    ExchangeRatesModule,
  ],
  controllers: [CryptoController],
  providers: [
    CryptoService,
    CryptoSyncService,
    CryptoPriceService,
    TronGridClient,
    BitcoinClient,
    SolanaRpcClient,
  ],
  exports: [CryptoService],
})
export class CryptoModule {}
