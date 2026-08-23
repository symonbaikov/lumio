import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoWallet } from '../../entities/crypto-wallet.entity';
import { ExchangeRate } from '../../entities/exchange-rate.entity';
import { Transaction } from '../../entities/transaction.entity';
import { Workspace } from '../../entities/workspace.entity';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { CryptoPriceService } from './crypto-price.service';
import { CryptoSyncService } from './crypto-sync.service';
import { CryptoController } from './crypto.controller';
import { CryptoService } from './crypto.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CryptoWallet, Transaction, Workspace, ExchangeRate]),
    ExchangeRatesModule,
  ],
  controllers: [CryptoController],
  providers: [CryptoService, CryptoSyncService, CryptoPriceService],
  exports: [CryptoService],
})
export class CryptoModule {}
