import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramReport } from '../../entities/telegram-report.entity';
import { User } from '../../entities/user.entity';
import { ApplicationSettingsModule } from '../application-settings/application-settings.module';
import { AuditModule } from '../audit/audit.module';
import { GoalsModule } from '../goals/goals.module';
import { InsightsModule } from '../insights/insights.module';
import { NetWorthModule } from '../net-worth/net-worth.module';
import { ReportsModule } from '../reports/reports.module';
import { StatementsModule } from '../statements/statements.module';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramWebhookGuard } from './telegram-webhook.guard';
import { TelegramController } from './telegram.controller';
import { TelegramScheduler } from './telegram.scheduler';
import { TelegramService } from './telegram.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramReport, User]),
    ApplicationSettingsModule,
    ReportsModule,
    StatementsModule,
    AuditModule,
    GoalsModule,
    NetWorthModule,
    InsightsModule,
  ],
  controllers: [TelegramController, TelegramWebhookController],
  providers: [TelegramService, TelegramScheduler, TelegramWebhookGuard],
  exports: [TelegramService],
})
export class TelegramModule {}
