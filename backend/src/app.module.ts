import * as path from 'node:path';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as redisStore from 'cache-manager-redis-store';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { getDatabaseConfig } from './config/database.config';
import {
  AuditEvent,
  AuthSession,
  BalanceAccount,
  BalanceSnapshot,
  Branch,
  Category,
  CategoryLearning,
  CustomTable,
  CustomTableColumn,
  CustomTableRow,
  DataEntry,
  DriveSettings,
  DropboxSettings,
  FilePermission,
  GmailSettings,
  GmailWatchSubscription,
  GoogleSheet,
  GoogleSheetRow,
  Integration,
  IntegrationToken,
  Insight,
  Notification,
  NotificationPreference,
  ParsingRule,
  Receipt,
  ReceiptProcessingJob,
  SharedLink,
  Statement,
  TaxRate,
  TelegramReport,
  Transaction,
  User,
  Wallet,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
} from './entities';
import { AuditModule } from './modules/audit/audit.module';
import { AuditInterceptor } from './modules/audit/interceptors/audit.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { BalanceModule } from './modules/balance/balance.module';
import { BranchesModule } from './modules/branches/branches.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ClassificationModule } from './modules/classification/classification.module';
import { CustomTablesModule } from './modules/custom-tables/custom-tables.module';
import { DataEntryModule } from './modules/data-entry/data-entry.module';
import { DropboxModule } from './modules/dropbox/dropbox.module';
import { GmailModule } from './modules/gmail/gmail.module';
import { GoogleDriveModule } from './modules/google-drive/google-drive.module';
import { GoogleSheetsModule } from './modules/google-sheets/google-sheets.module';
import { InsightsModule } from './modules/insights/insights.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HttpMetricsInterceptor } from './modules/observability/http-metrics.interceptor';
import { ObservabilityModule } from './modules/observability/observability.module';
import { ParsingModule } from './modules/parsing/parsing.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StatementsModule } from './modules/statements/statements.module';
import { StorageModule } from './modules/storage/storage.module';
import { TaxRatesModule } from './modules/tax-rates/tax-rates.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { UsersModule } from './modules/users/users.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), '../.env')],
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 500, // 500 requests per minute for authenticated users
      },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        url: configService.get('REDIS_URL') || 'redis://localhost:6379',
        ttl: 3600, // 1 hour default
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      User,
      Statement,
      Transaction,
      Category,
      CategoryLearning,
      Branch,
      Wallet,
      GoogleSheet,
      GoogleSheetRow,
      TelegramReport,
      ParsingRule,
      Notification,
      NotificationPreference,
      AuthSession,
      AuditEvent,
      BalanceAccount,
      BalanceSnapshot,
      SharedLink,
      FilePermission,
      DataEntry,
      CustomTable,
      CustomTableColumn,
      CustomTableRow,
      Workspace,
      WorkspaceInvitation,
      WorkspaceMember,
      Integration,
      IntegrationToken,
      Insight,
      DriveSettings,
      DropboxSettings,
      GmailSettings,
      GmailWatchSubscription,
      Receipt,
      ReceiptProcessingJob,
      TaxRate,
    ]),
    CommonModule,
    AuthModule,
    AuditModule,
    BalanceModule,
    UsersModule,
    StatementsModule,
    GoogleSheetsModule,
    GoogleDriveModule,
    GmailModule,
    DropboxModule,
    ParsingModule,
    ClassificationModule,
    CategoriesModule,
    BranchesModule,
    WalletsModule,
    TransactionsModule,
    ReportsModule,
    StorageModule,
    TelegramModule,
    TaxRatesModule,
    DataEntryModule,
    CustomTablesModule,
    WorkspacesModule,
    NotificationsModule,
    InsightsModule,
    ObservabilityModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
