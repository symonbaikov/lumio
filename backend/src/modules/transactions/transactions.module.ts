import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, WorkspaceMember } from '../../entities';
import { Statement } from '../../entities/statement.entity';
import { Transaction } from '../../entities/transaction.entity';
import { AuditModule } from '../audit/audit.module';
import { ClassificationModule } from '../classification/classification.module';
import { CrossStatementDeduplicationService } from './services/cross-statement-deduplication.service';
import { TransactionFingerprintService } from './services/transaction-fingerprint.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Statement, User, WorkspaceMember]),
    AuditModule,
    ClassificationModule,
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
