import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { ExchangeRate } from '../../entities/exchange-rate.entity';
import { COINGECKO_IDS } from './crypto.constants';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const PRICE_SOURCE = 'coingecko';

/**
 * Prices crypto assets in USD.
 *
 * Rates land in the existing `exchange_rates` table — it is keyed by an opaque
 * currency pair and a date, which describes `ETH → USD on 2026-08-21` exactly as
 * well as it describes `EUR → USD`. That also makes the cache permanent for past
 * dates: a historical price never changes, so each asset costs one API call ever.
 *
 * An asset missing from `COINGECKO_IDS` prices as `null` rather than zero, and the
 * sync drops it. That is the spam filter: airdropped scam tokens are unpriceable,
 * and counting them at face value would invent income the user never received.
 */
@Injectable()
export class CryptoPriceService {
  private readonly logger = new Logger(CryptoPriceService.name);

  constructor(
    @InjectRepository(ExchangeRate)
    private readonly exchangeRateRepo: Repository<ExchangeRate>,
  ) {}

  /** USD price of one unit of `asset` on `date`, or null if it cannot be priced. */
  async getUsdPrice(asset: string, date: Date): Promise<number | null> {
    const ticker = asset.toUpperCase();
    const coingeckoId = COINGECKO_IDS[ticker];
    if (!coingeckoId) {
      return null;
    }

    const dateOnly = toDateOnly(date);
    const cached = await this.exchangeRateRepo.findOne({
      where: { baseCurrency: ticker, targetCurrency: 'USD', rateDate: new Date(dateOnly) },
    });
    if (cached) {
      return Number(cached.rate);
    }

    const price = await this.fetchHistoricalPrice(coingeckoId, dateOnly);
    if (price === null) {
      return null;
    }

    await this.savePrice(ticker, price, dateOnly);
    return price;
  }

  /** Latest USD prices for several assets in one request. Unpriceable ones are absent. */
  async getCurrentUsdPrices(assets: string[]): Promise<Record<string, number>> {
    const tickers = [...new Set(assets.map(asset => asset.toUpperCase()))].filter(
      ticker => COINGECKO_IDS[ticker],
    );
    if (tickers.length === 0) {
      return {};
    }

    const idsByTicker = new Map(tickers.map(ticker => [COINGECKO_IDS[ticker], ticker]));
    const url = `${COINGECKO_BASE_URL}/simple/price?ids=${[...idsByTicker.keys()].join(',')}&vs_currencies=usd`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`CoinGecko simple/price returned ${response.status}`);
        return this.getLastKnownPrices(tickers);
      }

      const data = (await response.json()) as Record<string, { usd?: number }>;
      const prices: Record<string, number> = {};
      const today = toDateOnly(new Date());

      for (const [coingeckoId, ticker] of idsByTicker) {
        const price = data[coingeckoId]?.usd;
        if (typeof price === 'number' && Number.isFinite(price)) {
          prices[ticker] = price;
          await this.savePrice(ticker, price, today);
        }
      }

      const missing = tickers.filter(ticker => prices[ticker] === undefined);
      return { ...(await this.getLastKnownPrices(missing)), ...prices };
    } catch (error) {
      this.logger.warn(`CoinGecko simple/price failed: ${String(error)}`);
      return this.getLastKnownPrices(tickers);
    }
  }

  private async fetchHistoricalPrice(
    coingeckoId: string,
    dateOnly: string,
  ): Promise<number | null> {
    // CoinGecko's history endpoint wants DD-MM-YYYY, unlike every other date we handle.
    const [year, month, day] = dateOnly.split('-');
    const url = `${COINGECKO_BASE_URL}/coins/${coingeckoId}/history?date=${day}-${month}-${year}&localization=false`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`CoinGecko history for ${coingeckoId} returned ${response.status}`);
        return null;
      }
      const data = (await response.json()) as {
        market_data?: { current_price?: { usd?: number } };
      };
      const price = data.market_data?.current_price?.usd;
      return typeof price === 'number' && Number.isFinite(price) ? price : null;
    } catch (error) {
      this.logger.warn(`CoinGecko history for ${coingeckoId} failed: ${String(error)}`);
      return null;
    }
  }

  /**
   * Fallback when CoinGecko is unreachable: the most recent price we ever stored.
   * A stale portfolio value beats a portfolio that reads as zero.
   */
  private async getLastKnownPrices(tickers: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    for (const ticker of tickers) {
      const latest = await this.exchangeRateRepo.findOne({
        where: { baseCurrency: ticker, targetCurrency: 'USD' },
        order: { rateDate: 'DESC' },
      });
      if (latest) {
        prices[ticker] = Number(latest.rate);
      }
    }
    return prices;
  }

  private async savePrice(ticker: string, price: number, dateOnly: string): Promise<void> {
    await this.exchangeRateRepo
      .createQueryBuilder()
      .insert()
      .into(ExchangeRate)
      .values({
        baseCurrency: ticker,
        targetCurrency: 'USD',
        rate: price,
        rateDate: new Date(dateOnly),
        source: PRICE_SOURCE,
      })
      .orIgnore()
      .execute();
  }
}

function toDateOnly(date: Date): string {
  return date.toISOString().split('T')[0];
}
