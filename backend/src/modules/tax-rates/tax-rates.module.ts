import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxRate } from '../../entities/tax-rate.entity';
import { TaxRatesController } from './tax-rates.controller';
import { TaxRatesService } from './tax-rates.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaxRate])],
  controllers: [TaxRatesController],
  providers: [TaxRatesService],
  exports: [TaxRatesService],
})
export class TaxRatesModule {}
