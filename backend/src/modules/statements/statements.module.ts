import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileStorageService } from '../../common/services/file-storage.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { Category, TaxRate, User, WorkspaceMember } from '../../entities';
import { IdempotencyKey } from '../../entities/idempotency-key.entity';
import { Statement } from '../../entities/statement.entity';
import { Transaction } from '../../entities/transaction.entity';
import { AuditModule } from '../audit/audit.module';
import { ParsingModule } from '../parsing/parsing.module';
import { StatementsController } from './statements.controller';
import { StatementsService } from './statements.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Statement,
      Transaction,
      User,
      WorkspaceMember,
      IdempotencyKey,
      Category,
      TaxRate,
    ]),
    AuditModule,
    ParsingModule,
  ],
  controllers: [StatementsController],
  providers: [StatementsService, FileStorageService, IdempotencyService],
  exports: [StatementsService],
})
export class StatementsModule {}
