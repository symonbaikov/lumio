import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxJurisdictionRate } from '../../entities/tax-jurisdiction-rate.entity';
import { TaxJurisdiction } from '../../entities/tax-jurisdiction.entity';
import { TaxRate } from '../../entities/tax-rate.entity';
import { JurisdictionsController } from './jurisdictions.controller';
import { JurisdictionsService } from './jurisdictions.service';
import { TaxRatesController } from './tax-rates.controller';
import { TaxRatesService } from './tax-rates.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaxRate, TaxJurisdiction, TaxJurisdictionRate])],
  controllers: [TaxRatesController, JurisdictionsController],
  providers: [TaxRatesService, JurisdictionsService],
  exports: [TaxRatesService, JurisdictionsService],
})
export class TaxModule {}
