import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Budget } from '../../entities/budget.entity';
import { Category } from '../../entities/category.entity';
import { Goal } from '../../entities/goal.entity';
import { Transaction } from '../../entities/transaction.entity';
import { Workspace } from '../../entities/workspace.entity';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BudgetEventsListener } from './budget-events.listener';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import { StoicLedgerService } from './stoic/stoic-ledger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Budget, Category, Goal, Transaction, Workspace]),
    NotificationsModule,
    ExchangeRatesModule,
  ],
  controllers: [BudgetsController],
  providers: [BudgetsService, BudgetEventsListener, StoicLedgerService],
  exports: [BudgetsService, StoicLedgerService],
})
export class BudgetsModule {}
