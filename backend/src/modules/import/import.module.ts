import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../../entities/category.entity';
import { ImportSession } from '../../entities/import-session.entity';
import { Statement } from '../../entities/statement.entity';
import { Transaction } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { Wallet } from '../../entities/wallet.entity';
import { Workspace } from '../../entities/workspace.entity';
import { ClassificationModule } from '../classification/classification.module';
import { CustomTablesModule } from '../custom-tables/custom-tables.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { ParsingModule } from '../parsing/parsing.module';
import { IntelligentDeduplicationService } from '../parsing/services/intelligent-deduplication.service';
import { TransactionFingerprintService } from '../transactions/services/transaction-fingerprint.service';
import { ImportConfigService } from './config/import.config';
import { ImportSessionController } from './import-session.controller';
import { ImportRetryService } from './services/import-retry.service';
import { ImportSessionService } from './services/import-session.service';
import { SheetTransactionImportService } from './services/sheet-transaction-import.service';
import { SheetCurrencyService } from './sheets/sheet-currency.service';
import { SheetReferenceResolverService } from './sheets/sheet-reference-resolver.service';

/**
 * Import module providing configuration and services for import session workflow
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      ImportSession,
      Transaction,
      Statement,
      Workspace,
      User,
      Category,
      Wallet,
    ]),
    forwardRef(() => ParsingModule),
    GoogleSheetsModule,
    CustomTablesModule,
    ClassificationModule,
    ExchangeRatesModule,
  ],
  controllers: [ImportSessionController],
  providers: [
    ImportConfigService,
    ImportRetryService,
    ImportSessionService,
    TransactionFingerprintService,
    IntelligentDeduplicationService,
    SheetReferenceResolverService,
    SheetCurrencyService,
    SheetTransactionImportService,
  ],
  exports: [
    ImportConfigService,
    ImportRetryService,
    ImportSessionService,
    TransactionFingerprintService,
    IntelligentDeduplicationService,
    SheetTransactionImportService,
  ],
})
export class ImportModule {}
