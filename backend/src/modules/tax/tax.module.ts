import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxJurisdictionRate } from '../../entities/tax-jurisdiction-rate.entity';
import { TaxJurisdiction } from '../../entities/tax-jurisdiction.entity';
import { TaxRate } from '../../entities/tax-rate.entity';
import { TaxReturn } from '../../entities/tax-return.entity';
import { TaxRule } from '../../entities/tax-rule.entity';
import { Transaction } from '../../entities/transaction.entity';
import { Workspace } from '../../entities/workspace.entity';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JurisdictionAdoptionService } from './jurisdiction-adoption.service';
import { JurisdictionsController } from './jurisdictions.controller';
import { JurisdictionsService } from './jurisdictions.service';
import { TaxAssignmentService } from './tax-assignment.service';
import { TaxRatesController } from './tax-rates.controller';
import { TaxRatesService } from './tax-rates.service';
import { TaxReturnsController } from './tax-returns.controller';
import { TaxReturnsService } from './tax-returns.service';
import { TaxRulesController } from './tax-rules.controller';
import { TaxRulesService } from './tax-rules.service';
import { TaxThresholdService } from './tax-threshold.service';
import { WorkspaceTaxController } from './workspace-tax.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaxRate,
      TaxJurisdiction,
      TaxJurisdictionRate,
      TaxRule,
      TaxReturn,
      Transaction,
      Workspace,
    ]),
    ExchangeRatesModule,
    NotificationsModule,
  ],
  controllers: [
    TaxRatesController,
    JurisdictionsController,
    WorkspaceTaxController,
    TaxRulesController,
    TaxReturnsController,
  ],
  providers: [
    TaxRatesService,
    JurisdictionsService,
    JurisdictionAdoptionService,
    TaxRulesService,
    TaxAssignmentService,
    TaxReturnsService,
    TaxThresholdService,
  ],
  exports: [
    TaxRatesService,
    JurisdictionsService,
    JurisdictionAdoptionService,
    TaxRulesService,
    TaxAssignmentService,
    TaxReturnsService,
    TaxThresholdService,
  ],
})
export class TaxModule {}
