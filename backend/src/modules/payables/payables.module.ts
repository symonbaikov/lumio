import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payable } from '../../entities/payable.entity';
import { Statement } from '../../entities/statement.entity';
import { Transaction } from '../../entities/transaction.entity';
import { Workspace } from '../../entities/workspace.entity';
import { AuditModule } from '../audit/audit.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PayablesController } from './payables.controller';
import { PayablesScheduler } from './payables.scheduler';
import { PayablesService } from './payables.service';
import { PayablesExportService } from './payables-export.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payable, Transaction, Statement, Workspace]),
    AuditModule,
    ExchangeRatesModule,
    NotificationsModule,
  ],
  controllers: [PayablesController],
  providers: [PayablesService, PayablesExportService, PayablesScheduler],
  exports: [PayablesService],
})
export class PayablesModule {}
