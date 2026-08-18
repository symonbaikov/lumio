import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Budget, Insight, Transaction, User } from '../../entities';
import { NetWorthModule } from '../net-worth/net-worth.module';
import { FinancialAnalyzer } from './analyzers/financial.analyzer';
import { OperationalAnalyzer } from './analyzers/operational.analyzer';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';

@Module({
  imports: [TypeOrmModule.forFeature([Insight, Transaction, Budget, User]), NetWorthModule],
  controllers: [InsightsController],
  providers: [InsightsService, OperationalAnalyzer, FinancialAnalyzer],
  exports: [InsightsService],
})
export class InsightsModule {}
