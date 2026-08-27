import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../../entities/category.entity';
import { CustomTableCellStyle } from '../../entities/custom-table-cell-style.entity';
import { CustomTableColumnStyle } from '../../entities/custom-table-column-style.entity';
import { CustomTableColumn } from '../../entities/custom-table-column.entity';
import { CustomTableExportSchedule } from '../../entities/custom-table-export-schedule.entity';
import { CustomTableImportJob } from '../../entities/custom-table-import-job.entity';
import { CustomTableRowComment } from '../../entities/custom-table-row-comment.entity';
import { CustomTableRow } from '../../entities/custom-table-row.entity';
import { CustomTableShare } from '../../entities/custom-table-share.entity';
import { CustomTable } from '../../entities/custom-table.entity';
import { DataEntryCustomField } from '../../entities/data-entry-custom-field.entity';
import { DataEntry } from '../../entities/data-entry.entity';
import { GoogleSheet } from '../../entities/google-sheet.entity';
import { Statement } from '../../entities/statement.entity';
import { Transaction } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { WorkspaceMember } from '../../entities/workspace-member.entity';
import { AuditModule } from '../audit/audit.module';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { ImportModule } from '../import/import.module';
import { CustomTableCommentsController } from './custom-table-comments.controller';
import { CustomTableCommentsService } from './custom-table-comments.service';
import { CustomTableExportSchedulesScheduler } from './custom-table-export-schedules.scheduler';
import { CustomTableExportSchedulesService } from './custom-table-export-schedules.service';
import { CustomTableImportJobsProcessor } from './custom-table-import-jobs.processor';
import { CustomTableImportJobsService } from './custom-table-import-jobs.service';
import {
  CustomTableSharesController,
  PublicCustomTableSharesController,
} from './custom-table-shares.controller';
import { CustomTableSharesService } from './custom-table-shares.service';
import { CustomTableSyncScheduler } from './custom-table-sync.scheduler';
import { CustomTableSyncService } from './custom-table-sync.service';
import { CustomTablesCacheService } from './custom-tables-cache.service';
import { CustomTablesImportService } from './custom-tables-import.service';
import { CustomTablesController } from './custom-tables.controller';
import { CustomTablesService } from './custom-tables.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomTable,
      CustomTableImportJob,
      CustomTableColumnStyle,
      CustomTableColumn,
      CustomTableRow,
      CustomTableCellStyle,
      CustomTableShare,
      CustomTableExportSchedule,
      CustomTableRowComment,
      DataEntry,
      DataEntryCustomField,
      GoogleSheet,
      Category,
      Statement,
      Transaction,
      User,
      WorkspaceMember,
    ]),
    AuditModule,
    GoogleSheetsModule,
    forwardRef(() => ImportModule),
  ],
  controllers: [
    CustomTablesController,
    CustomTableSharesController,
    PublicCustomTableSharesController,
    CustomTableCommentsController,
  ],
  providers: [
    CustomTablesService,
    CustomTablesCacheService,
    CustomTablesImportService,
    CustomTableImportJobsService,
    CustomTableImportJobsProcessor,
    CustomTableSharesService,
    CustomTableSyncService,
    CustomTableSyncScheduler,
    CustomTableExportSchedulesService,
    CustomTableExportSchedulesScheduler,
    CustomTableCommentsService,
  ],
  exports: [CustomTablesService, CustomTableImportJobsService],
})
export class CustomTablesModule {}
