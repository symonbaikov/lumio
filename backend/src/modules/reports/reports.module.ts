import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '../../entities/branch.entity';
import { Category } from '../../entities/category.entity';
import { CustomTableColumn } from '../../entities/custom-table-column.entity';
import { CustomTableRow } from '../../entities/custom-table-row.entity';
import { CustomTable } from '../../entities/custom-table.entity';
import { ReportHistory } from '../../entities/report-history.entity';
import { Transaction } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { Wallet } from '../../entities/wallet.entity';
import { AuditModule } from '../audit/audit.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      Category,
      Branch,
      Wallet,
      CustomTable,
      CustomTableColumn,
      CustomTableRow,
      User,
      ReportHistory,
    ]),
    AuditModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
