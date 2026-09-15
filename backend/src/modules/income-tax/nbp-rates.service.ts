import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';

export interface NbpRate {
  /** YYYY-MM-DD, the business day the rate was published for. */
  effectiveDate: string;
  /** PLN per one unit of the currency. */
  mid: number;
}

const NBP_API = 'https://api.nbp.pl/api/exchangerates/rates/a';
/** NBP rejects ranges longer than 93 days in one request. */
const MAX_WINDOW_DAYS = 93;
const DAY_MS = 86_400_000;
const REQUEST_TIMEOUT_MS = 10_000;

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Inclusive [from, to] split into consecutive windows NBP will accept. */
export function splitIntoWindows(
  from: string,
  to: string,
  maxDays: number = MAX_WINDOW_DAYS,
): Array<[string, string]> {
  const windows: Array<[string, string]> = [];
  let start = from;
  while (start <= to) {
    const candidateEnd = addDays(start, maxDays - 1);
    const end = candidateEnd < to ? candidateEnd : to;
    windows.push([start, end]);
    start = addDays(end, 1);
  }
  return windows;
}

/**
 * The rate of the last business day strictly before `date`.
 *
 * Rates must be sorted by date. Weekends and Polish holidays have no entry, so
 * "the day before" is simply the latest published date earlier than `date`.
 */
export function previousBusinessDayRate(rates: NbpRate[], date: string): NbpRate | null {
  let low = 0;
  let high = rates.length - 1;
  let found: NbpRate | null = null;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (rates[middle].effectiveDate < date) {
      found = rates[middle];
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

/**
 * National Bank of Poland average rates (table A), as Polish income tax
 * requires. Kept apart from ExchangeRatesService on purpose: those rates come
 * from commercial feeds and fall back to stale values, which a declaration
 * converted under art. 11a cannot use.
 */
@Injectable()
export class NbpRatesService {
  private readonly logger = new Logger(NbpRatesService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Every table A rate for a currency over the tax year, starting in the
   * previous December so the first days of January still find a prior rate.
   * NULL when NBP publishes no table A rate for the currency or cannot be reached.
   */
  async getYearRates(
    currency: string,
    taxYear: number,
    now: Date = new Date(),
  ): Promise<NbpRate[] | null> {
    const code = currency.toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) {
      return null;
    }

    const cacheKey = `nbp:a:${code}:${taxYear}`;
    const cached = await this.cacheManager.get<NbpRate[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const today = now.toISOString().slice(0, 10);
    const yearEnd = `${taxYear}-12-31`;
    const from = `${taxYear - 1}-12-01`;
    const to = yearEnd < today ? yearEnd : today;
    if (to < from) {
      return null;
    }

    const rates: NbpRate[] = [];
    try {
      for (const [start, end] of splitIntoWindows(from, to)) {
        const response = await fetch(
          `${NBP_API}/${code.toLowerCase()}/${start}/${end}/?format=json`,
          {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          },
        );
        // 404 means no quotes in the window — a holiday stretch, or a currency
        // table A does not carry. Either way there is nothing to add.
        if (response.status === 404) {
          continue;
        }
        if (!response.ok) {
          this.logger.warn(`NBP rates for ${code} ${start}..${end} returned ${response.status}`);
          return null;
        }
        const body = (await response.json()) as {
          rates?: Array<{ effectiveDate: string; mid: number }>;
        };
        for (const rate of body.rates ?? []) {
          rates.push({ effectiveDate: rate.effectiveDate, mid: Number(rate.mid) });
        }
      }
    } catch (error) {
      this.logger.warn(`NBP rates for ${code} ${taxYear} unavailable: ${(error as Error).message}`);
      return null;
    }

    if (rates.length === 0) {
      return null;
    }
    rates.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

    // A finished year never changes; the current one gains a rate every business day.
    await this.cacheManager.set(cacheKey, rates, yearEnd < today ? 0 : 4 * 3600);
    return rates;
  }
}
