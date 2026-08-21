import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxJurisdictionRate } from '../../entities/tax-jurisdiction-rate.entity';
import { TaxJurisdiction } from '../../entities/tax-jurisdiction.entity';
import { TaxRate } from '../../entities/tax-rate.entity';
import { TaxRule } from '../../entities/tax-rule.entity';
import { Workspace } from '../../entities/workspace.entity';
import { JurisdictionAdoptionService } from './jurisdiction-adoption.service';
import { JurisdictionsController } from './jurisdictions.controller';
import { JurisdictionsService } from './jurisdictions.service';
import { TaxAssignmentService } from './tax-assignment.service';
import { TaxRatesController } from './tax-rates.controller';
import { TaxRatesService } from './tax-rates.service';
import { TaxRulesController } from './tax-rules.controller';
import { TaxRulesService } from './tax-rules.service';
import { WorkspaceTaxController } from './workspace-tax.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaxRate, TaxJurisdiction, TaxJurisdictionRate, TaxRule, Workspace]),
  ],
  controllers: [
    TaxRatesController,
    JurisdictionsController,
    WorkspaceTaxController,
    TaxRulesController,
  ],
  providers: [
    TaxRatesService,
    JurisdictionsService,
    JurisdictionAdoptionService,
    TaxRulesService,
    TaxAssignmentService,
  ],
  exports: [
    TaxRatesService,
    JurisdictionsService,
    JurisdictionAdoptionService,
    TaxRulesService,
    TaxAssignmentService,
  ],
})
export class TaxModule {}
