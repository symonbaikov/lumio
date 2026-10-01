import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { Workspace } from '../../entities/workspace.entity';
import { BulkConvertDto } from './dto/convert.dto';
import { ManualRateDto } from './dto/manual-rate.dto';
import { ExchangeRatesService } from './exchange-rates.service';

@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(
    private readonly exchangeRatesService: ExchangeRatesService,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
  ) {}

  /** The rate, or `missing: true` with rate 1 when none exists — never a silent 1. */
  @Get()
  async getRate(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('date') date?: string,
  ) {
    const rateDate = date ? new Date(date) : undefined;
    const quote = await this.exchangeRatesService.getRateQuote(from, to, rateDate);
    return {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate: quote?.rate ?? 1,
      date: date ?? null,
      rateDate: quote?.rateDate ?? null,
      stale: quote?.stale ?? false,
      missing: quote === null,
    };
  }

  /** Every currency in this workspace's rows and whether a rate to the workspace currency exists. */
  @Get('coverage')
  @WorkspaceAuth(Permission.REPORT_VIEW)
  async coverage(@WorkspaceId() workspaceId: string) {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      select: ['currency'],
    });
    const currency = (workspace?.currency || 'KZT').toUpperCase();
    const currencies = await this.exchangeRatesService.coverageForWorkspace(workspaceId, currency);
    return {
      currency,
      currencies,
      missing: currencies.filter(item => item.rate === null).map(item => item.currency),
    };
  }

  /** A rate entered by hand for one day; wins over the provider for that day. */
  @Post('manual')
  @WorkspaceAuth(Permission.WORKSPACE_SETTINGS_MANAGE)
  async setManual(@Body() dto: ManualRateDto) {
    return this.exchangeRatesService.setManualRate(dto.from, dto.to, dto.rate, dto.date);
  }

  @Post('convert')
  async bulkConvert(@Body() dto: BulkConvertDto) {
    const items = dto.items.map(item => ({
      amount: item.amount,
      currency: item.currency,
      date: item.date ? new Date(item.date) : undefined,
    }));
    const results = await this.exchangeRatesService.bulkConvert(items, dto.targetCurrency);
    return { targetCurrency: dto.targetCurrency, results };
  }
}
