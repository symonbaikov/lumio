import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BalanceAccount,
  BalanceSnapshot,
  Statement,
  Transaction,
  Wallet,
  Workspace,
  WorkspaceMember,
} from '../../entities';
import { BalanceModule } from '../balance/balance.module';
import { NetWorthController } from './net-worth.controller';
import { NetWorthService } from './net-worth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BalanceAccount,
      BalanceSnapshot,
      Wallet,
      Transaction,
      Statement,
      Workspace,
      WorkspaceMember,
    ]),
    BalanceModule,
  ],
  controllers: [NetWorthController],
  providers: [NetWorthService],
  exports: [NetWorthService],
})
export class NetWorthModule {}
