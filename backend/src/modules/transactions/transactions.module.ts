import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, WorkspaceMember } from '../../entities';
import { Statement } from '../../entities/statement.entity';
import { Transaction } from '../../entities/transaction.entity';
import { AuditModule } from '../audit/audit.module';
import { ClassificationModule } from '../classification/classification.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { TaxModule } from '../tax/tax.module';
import { CrossStatementDeduplicationService } from './services/cross-statement-deduplication.service';
import { TransactionFingerprintService } from './services/transaction-fingerprint.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Statement, User, WorkspaceMember]),
    AuditModule,
    ClassificationModule,
    ExchangeRatesModule,
    TaxModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    CrossStatementDeduplicationService,
    TransactionFingerprintService,
  ],
  exports: [TransactionsService, CrossStatementDeduplicationService, TransactionFingerprintService],
})
export class TransactionsModule {}
