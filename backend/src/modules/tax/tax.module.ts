import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxJurisdictionRate } from '../../entities/tax-jurisdiction-rate.entity';
import { TaxJurisdiction } from '../../entities/tax-jurisdiction.entity';
import { TaxRate } from '../../entities/tax-rate.entity';
import { Workspace } from '../../entities/workspace.entity';
import { JurisdictionAdoptionService } from './jurisdiction-adoption.service';
import { JurisdictionsController } from './jurisdictions.controller';
import { JurisdictionsService } from './jurisdictions.service';
import { TaxRatesController } from './tax-rates.controller';
import { TaxRatesService } from './tax-rates.service';
import { WorkspaceTaxController } from './workspace-tax.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaxRate, TaxJurisdiction, TaxJurisdictionRate, Workspace])],
  controllers: [TaxRatesController, JurisdictionsController, WorkspaceTaxController],
  providers: [TaxRatesService, JurisdictionsService, JurisdictionAdoptionService],
  exports: [TaxRatesService, JurisdictionsService, JurisdictionAdoptionService],
})
export class TaxModule {}
