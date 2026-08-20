import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category, Receipt, ReceiptProcessingJob, Statement, Transaction } from '../../entities';
import { ApplicationSettingsModule } from '../application-settings/application-settings.module';
import { ParsingModule } from '../parsing/parsing.module';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { ReceiptCategoryService } from './services/receipt-category.service';
import { ReceiptDuplicateService } from './services/receipt-duplicate.service';
import { ReceiptProcessorService } from './services/receipt-processor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Receipt, ReceiptProcessingJob, Category, Statement, Transaction]),
    ParsingModule,
    ApplicationSettingsModule,
  ],
  controllers: [ReceiptsController],
  providers: [
    ReceiptsService,
    ReceiptCategoryService,
    ReceiptDuplicateService,
    ReceiptProcessorService,
  ],
  exports: [ReceiptsService, ReceiptCategoryService, ReceiptDuplicateService],
})
export class ReceiptsModule {}
