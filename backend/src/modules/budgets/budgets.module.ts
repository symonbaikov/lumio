import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Budget } from '../../entities/budget.entity';
import { Transaction } from '../../entities/transaction.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { BudgetEventsListener } from './budget-events.listener';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Budget, Transaction]), NotificationsModule],
  controllers: [BudgetsController],
  providers: [BudgetsService, BudgetEventsListener],
  exports: [BudgetsService],
})
export class BudgetsModule {}
