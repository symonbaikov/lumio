import type { MappedSheetRow } from '@/modules/import/sheets/map-sheet-rows';
import { SheetCurrencyService } from '@/modules/import/sheets/sheet-currency.service';
import type { ExchangeRatesService } from '@/modules/exchange-rates/exchange-rates.service';

function makeRow(
  rowNumber: number,
  overrides: Partial<{
    status: MappedSheetRow['status'];
    currency: string;
    debit?: number;
    credit?: number;
    transactionDate: Date;
  }> = {},
): MappedSheetRow {
  const {
    status = 'ok',
    currency = 'KZT',
    debit,
    credit = debit === undefined ? 100 : undefined,
    transactionDate = new Date(Date.UTC(2024, 2, 15)),
  } = overrides;

  if (status !== 'ok') {
    return { rowNumber, status, issues: [], raw: [] };
  }

  return {
    rowNumber,
    status: 'ok',
    issues: [],
    raw: [],
    transaction: {
      transactionDate,
      counterpartyName: 'Someone',
      paymentPurpose: 'purpose',
      currency,
      debit,
      credit,
    },
  };
}

describe('SheetCurrencyService', () => {
  let exchangeRatesService: ExchangeRatesService & Record<string, any>;
  let service: SheetCurrencyService;

  beforeEach(() => {
    exchangeRatesService = {
      getRate: jest.fn(),
    } as unknown as ExchangeRatesService & Record<string, any>;
    service = new SheetCurrencyService(exchangeRatesService as any);
  });

  it('leaves a row untouched and never calls getRate when currency matches the workspace currency', async () => {
    const row = makeRow(1, { currency: 'KZT', credit: 100 });

    const { rows, warnings } = await service.convertRows([row], 'KZT');

    expect(exchangeRatesService.getRate).not.toHaveBeenCalled();
    expect(rows[0].transaction?.credit).toBe(100);
    expect(rows[0].transaction?.amountForeign).toBeUndefined();
    expect(rows[0].transaction?.exchangeRate).toBeUndefined();
    expect(warnings).toHaveLength(0);
  });

  it('matches currency case-insensitively without converting', async () => {
    const row = makeRow(1, { currency: 'kzt', credit: 100 });

    const { rows } = await service.convertRows([row], 'KZT');

    expect(exchangeRatesService.getRate).not.toHaveBeenCalled();
    expect(rows[0].transaction?.credit).toBe(100);
  });

  it('converts a foreign-currency row, matching the createTransaction FX convention', async () => {
    exchangeRatesService.getRate.mockResolvedValueOnce(450);
    const row = makeRow(1, { currency: 'USD', credit: 100 });

    const { rows, warnings } = await service.convertRows([row], 'KZT');

    expect(exchangeRatesService.getRate).toHaveBeenCalledWith(
      'USD',
      'KZT',
      row.transaction?.transactionDate,
    );
    const t = rows[0].transaction!;
    expect(t.amountForeign).toBe(100);
    expect(t.exchangeRate).toBe(450);
    expect(t.credit).toBe(45000);
    expect(t.debit).toBeUndefined();
    expect(warnings).toHaveLength(0);
  });

  it('converts a debit row correctly, preserving debit rather than credit', async () => {
    exchangeRatesService.getRate.mockResolvedValueOnce(450);
    const row = makeRow(1, { currency: 'USD', debit: 100, credit: undefined });

    const { rows } = await service.convertRows([row], 'KZT');

    const t = rows[0].transaction!;
    expect(t.amountForeign).toBe(100);
    expect(t.debit).toBe(45000);
    expect(t.credit).toBeUndefined();
  });

  it('fetches the rate exactly once per unique (currency, date) pair across 100 rows over 3 dates', async () => {
    exchangeRatesService.getRate.mockResolvedValue(450);
    const dates = [
      new Date(Date.UTC(2024, 0, 1)),
      new Date(Date.UTC(2024, 0, 2)),
      new Date(Date.UTC(2024, 0, 3)),
    ];
    const rows: MappedSheetRow[] = Array.from({ length: 100 }, (_, i) =>
      makeRow(i + 1, {
        currency: 'USD',
        credit: 100,
        transactionDate: dates[i % 3],
      }),
    );

    await service.convertRows(rows, 'KZT');

    expect(exchangeRatesService.getRate).toHaveBeenCalledTimes(3);
  });

  it('leaves rows untouched and adds one warning per failed (currency, date) key, not per row', async () => {
    exchangeRatesService.getRate.mockRejectedValue(new Error('rate unavailable'));
    const date = new Date(Date.UTC(2024, 2, 15));
    const rows: MappedSheetRow[] = [
      makeRow(1, { currency: 'USD', credit: 100, transactionDate: date }),
      makeRow(2, { currency: 'USD', credit: 200, transactionDate: date }),
    ];

    const { rows: resultRows, warnings } = await service.convertRows(rows, 'KZT');

    expect(resultRows[0].transaction?.credit).toBe(100);
    expect(resultRows[0].transaction?.exchangeRate).toBeUndefined();
    expect(resultRows[0].transaction?.amountForeign).toBeUndefined();
    expect(resultRows[1].transaction?.credit).toBe(200);
    expect(warnings).toEqual(['fx_unavailable:USD:2024-03-15']);
  });

  it('does not let one failed key affect a different successful key', async () => {
    exchangeRatesService.getRate.mockImplementation(async (from: string) => {
      if (from === 'USD') {
        throw new Error('down');
      }
      return 5;
    });
    const date = new Date(Date.UTC(2024, 2, 15));
    const rows: MappedSheetRow[] = [
      makeRow(1, { currency: 'USD', credit: 100, transactionDate: date }),
      makeRow(2, { currency: 'EUR', credit: 100, transactionDate: date }),
    ];

    const { rows: resultRows, warnings } = await service.convertRows(rows, 'KZT');

    expect(resultRows[0].transaction?.credit).toBe(100);
    expect(resultRows[1].transaction?.credit).toBe(500);
    expect(warnings).toEqual(['fx_unavailable:USD:2024-03-15']);
  });

  it('rounds the converted amount to 2 decimal places, avoiding floating point drift', async () => {
    exchangeRatesService.getRate.mockResolvedValueOnce(3.333);
    const row = makeRow(1, { currency: 'USD', credit: 360 });

    const { rows } = await service.convertRows([row], 'KZT');

    // 360 * 3.333 = 1199.88 exactly, but 200 * 3.333... style inputs can
    // drift; use an amount/rate pair known to produce a repeating binary
    // fraction to prove real rounding happens.
    expect(rows[0].transaction?.credit).toBe(1199.88);
  });

  it('rounds away naive floating-point drift for a case like 0.1 + 0.2', async () => {
    exchangeRatesService.getRate.mockResolvedValueOnce(1.1);
    const row = makeRow(1, { currency: 'USD', credit: 1090.91 });

    const { rows } = await service.convertRows([row], 'KZT');

    const credit = rows[0].transaction!.credit!;
    expect(credit).toBe(Math.round(1090.91 * 1.1 * 100) / 100);
    expect(Number.isInteger(credit * 100)).toBe(true);
  });

  it('passes through rows with non-ok status untouched', async () => {
    const invalidRow = makeRow(1, { status: 'invalid' });
    const skippedRow = makeRow(2, { status: 'skipped' });

    const { rows, warnings } = await service.convertRows([invalidRow, skippedRow], 'KZT');

    expect(exchangeRatesService.getRate).not.toHaveBeenCalled();
    expect(rows[0]).toEqual(invalidRow);
    expect(rows[1]).toEqual(skippedRow);
    expect(warnings).toHaveLength(0);
  });
});
