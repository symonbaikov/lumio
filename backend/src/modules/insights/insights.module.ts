import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Insight, Transaction } from '../../entities';
import { OperationalAnalyzer } from './analyzers/operational.analyzer';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';

@Module({
  imports: [TypeOrmModule.forFeature([Insight, Transaction])],
  controllers: [InsightsController],
  providers: [InsightsService, OperationalAnalyzer],
  exports: [InsightsService],
})
export class InsightsModule {}
