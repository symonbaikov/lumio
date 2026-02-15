import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BalanceAccount,
  BalanceSnapshot,
  Statement,
  Transaction,
  Wallet,
  WorkspaceMember,
} from '../../entities';
import { AuditModule } from '../audit/audit.module';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BalanceAccount,
      BalanceSnapshot,
      Wallet,
      Transaction,
      Statement,
      WorkspaceMember,
    ]),
    AuditModule,
  ],
  controllers: [BalanceController],
  providers: [BalanceService],
  exports: [BalanceService],
})
export class BalanceModule {}
