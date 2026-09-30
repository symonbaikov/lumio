import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Category,
  Receipt,
  ReceiptProcessingJob,
  Statement,
  Transaction,
  User,
  WorkspaceMember,
} from '../../entities';
import { ApplicationSettingsModule } from '../application-settings/application-settings.module';
import { AuditModule } from '../audit/audit.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { ParsingModule } from '../parsing/parsing.module';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { ReceiptCategoryService } from './services/receipt-category.service';
import { ReceiptDuplicateService } from './services/receipt-duplicate.service';
import { ReceiptLocationService } from './services/receipt-location.service';
import { ReceiptProcessorService } from './services/receipt-processor.service';
import { ReceiptStageService } from './services/receipt-stage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Receipt,
      ReceiptProcessingJob,
      Category,
      Statement,
      Transaction,
      User,
      WorkspaceMember,
    ]),
    AuditModule,
    ParsingModule,
    ApplicationSettingsModule,
    GeocodingModule,
  ],
  controllers: [ReceiptsController],
  providers: [
    ReceiptsService,
    ReceiptCategoryService,
    ReceiptDuplicateService,
    ReceiptLocationService,
    ReceiptProcessorService,
    ReceiptStageService,
  ],
  exports: [ReceiptsService, ReceiptCategoryService, ReceiptDuplicateService],
})
export class ReceiptsModule {}
