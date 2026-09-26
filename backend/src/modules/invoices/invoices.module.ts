import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../../entities/client.entity';
import { Invoice } from '../../entities/invoice.entity';
import { InvoiceCounter } from '../../entities/invoice-counter.entity';
import { InvoiceLineItem } from '../../entities/invoice-line-item.entity';
import { Payable } from '../../entities/payable.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { TaxModule } from '../tax/tax.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesScheduler } from './invoices.scheduler';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceLineItem, InvoiceCounter, Client, Payable]),
    LedgerModule,
    TaxModule,
  ],
  controllers: [InvoicesController, ClientsController],
  providers: [InvoicesService, ClientsService, InvoicesScheduler],
  exports: [InvoicesService, ClientsService],
})
export class InvoicesModule {}
