import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleSheetsCredential, User, WorkspaceMember } from '../../entities';
import { Branch } from '../../entities/branch.entity';
import { Category } from '../../entities/category.entity';
import { GoogleSheetRow } from '../../entities/google-sheet-row.entity';
import { GoogleSheet } from '../../entities/google-sheet.entity';
import { Transaction } from '../../entities/transaction.entity';
import { Wallet } from '../../entities/wallet.entity';
import { AuditModule } from '../audit/audit.module';
import { GoogleSheetsIntegrationController } from './google-sheets-integration.controller';
import { GoogleSheetsController } from './google-sheets.controller';
import { GoogleSheetsService } from './google-sheets.service';
import { GoogleSheetsWebhookGuard } from './guards/google-sheets-webhook.guard';
import { GoogleSheetsAnalyticsService } from './services/google-sheets-analytics.service';
import { GoogleSheetsApiService } from './services/google-sheets-api.service';
import { GoogleSheetsRealtimeService } from './services/google-sheets-realtime.service';
import { GoogleSheetsUpdatesService } from './services/google-sheets-updates.service';
import { SheetSourceLoaderService } from './services/sheet-source-loader.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GoogleSheet,
      GoogleSheetsCredential,
      GoogleSheetRow,
      Transaction,
      Category,
      Branch,
      Wallet,
      User,
      WorkspaceMember,
    ]),
    ConfigModule,
    AuditModule,
  ],
  controllers: [GoogleSheetsController, GoogleSheetsIntegrationController],
  providers: [
    GoogleSheetsService,
    GoogleSheetsApiService,
    GoogleSheetsUpdatesService,
    GoogleSheetsRealtimeService,
    GoogleSheetsAnalyticsService,
    GoogleSheetsWebhookGuard,
    SheetSourceLoaderService,
  ],
  exports: [
    GoogleSheetsService,
    GoogleSheetsApiService,
    GoogleSheetsUpdatesService,
    SheetSourceLoaderService,
  ],
})
export class GoogleSheetsModule {}
