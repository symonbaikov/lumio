import { filingInfoFor } from '@/modules/income-tax/filing-info';
import {
  previousBusinessDayRate,
  splitIntoWindows,
} from '@/modules/income-tax/nbp-rates.service';
import { genericSummaryPack, type PackInput, resolvePack } from '@/modules/income-tax/rule-packs';
import { fxRuleFor } from '@/modules/income-tax/rule-packs/fx-rules';
import { plPit28Pack } from '@/modules/income-tax/rule-packs/pl/pit28';
import { plPit36lPack } from '@/modules/income-tax/rule-packs/pl/pit36l';

const item = (amountMinor: number) => ({ counterparty: 'Client', amountMinor });

const input = (over: Partial<PackInput> = {}): PackInput => ({
  taxYear: 2025,
  items: {},
  details: {},
  ...over,
});

const figureOf = (figures: Array<{ key: string }>, key: string) =>
  figures.find(figure => figure.key === key) as
    | { amountMinor: number; deductibleMinor: number; lineNo: string | null; fieldNo: string | null }
    | undefined;

describe('PIT-36L (2025)', () => {
  it('lays revenue, costs and income on part E row 1 and deducts contributions in items 40 and 41', () => {
    const result = plPit36lPack.compute(
      input({
        items: {
          revenue: [item(200_000_00)],
          costs: [item(50_000_00)],
          zus_social: [item(18_000_00)],
          health_contribution: [item(10_000_00)],
        },
      }),
    );

    expect(figureOf(result.figures, 'revenue')).toMatchObject({ lineNo: 'E.1', fieldNo: 'b' });
    expect(figureOf(result.figures, 'income')).toMatchObject({ fieldNo: 'd', amountMinor: 150_000_00 });
    expect(figureOf(result.figures, 'zus_social')).toMatchObject({
      lineNo: 'poz. 40',
      deductibleMinor: 18_000_00,
    });
    expect(figureOf(result.figures, 'health_contribution')).toMatchObject({
      lineNo: 'poz. 41',
      deductibleMinor: 10_000_00,
    });
    expect(figureOf(result.figures, 'income_after_deductions')?.amountMinor).toBe(122_000_00);
    expect(result.taxEstimate).toBeNull();
  });

  it('caps the health contribution at 12 900 PLN across cost and deduction', () => {
    const result = plPit36lPack.compute(
      input({
        details: { healthTreatment: 'cost' },
        items: { revenue: [item(100_000_00)], health_contribution: [item(15_000_00)] },
      }),
    );

    expect(figureOf(result.figures, 'costs')?.amountMinor).toBe(12_900_00);
    expect(figureOf(result.figures, 'health_contribution')?.deductibleMinor).toBe(0);
    expect(result.warnings.map(w => w.code)).toContain('pl_health_cap_applied');
  });

  it('never counts a contribution twice when it is treated as a cost', () => {
    const result = plPit36lPack.compute(
      input({
        details: { zusTreatment: 'cost' },
        items: { revenue: [item(50_000_00)], zus_social: [item(10_000_00)] },
      }),
    );

    expect(figureOf(result.figures, 'costs')?.amountMinor).toBe(10_000_00);
    expect(figureOf(result.figures, 'zus_social')?.deductibleMinor).toBe(0);
    expect(figureOf(result.figures, 'income_after_deductions')?.amountMinor).toBe(40_000_00);
  });

  it('reports a loss in column e and flags deductions larger than income', () => {
    const result = plPit36lPack.compute(
      input({ items: { revenue: [item(1_000_00)], costs: [item(3_000_00)], zus_social: [item(500_00)] } }),
    );

    expect(figureOf(result.figures, 'loss')).toMatchObject({ fieldNo: 'e', amountMinor: 2_000_00 });
    expect(figureOf(result.figures, 'income_after_deductions')?.amountMinor).toBe(0);
    expect(result.warnings.map(w => w.code)).toContain('pl_deductions_exceed_income');
  });
});

describe('PIT-28 ryczałt (2025)', () => {
  it('keeps revenue per rate and reduces it by half the health contribution', () => {
    const result = plPit28Pack.compute(
      input({ items: { revenue_12: [item(120_000_00)], health_contribution: [item(9_001_00)] } }),
    );

    expect(figureOf(result.figures, 'revenue_12')?.amountMinor).toBe(120_000_00);
    expect(figureOf(result.figures, 'health_contribution')?.deductibleMinor).toBe(4_500_50);
    expect(figureOf(result.figures, 'revenue_after_reduction')?.amountMinor).toBe(115_499_50);
    expect(result.warnings).toEqual([]);
  });

  it('flags several rates and a previous-year revenue above 8 569 200 PLN', () => {
    const codes = plPit28Pack
      .compute(
        input({
          details: { previousYearRevenue: 8_569_201 },
          items: { revenue_12: [item(1_00)], revenue_15: [item(1_00)] },
        }),
      )
      .warnings.map(w => w.code);

    expect(codes).toEqual(['pl_ryczalt_limit_exceeded', 'pl_ryczalt_multiple_rates']);
  });
});

describe('Polish pack selection', () => {
  it('picks the form by the chosen regime and falls back for the unverified scale', () => {
    expect(resolvePack('PL', 2025, 'self_employed', { regime: 'liniowy' })).toBe(plPit36lPack);
    expect(resolvePack('PL', 2025, 'self_employed', { regime: 'ryczalt' })).toBe(plPit28Pack);
    expect(resolvePack('PL', 2025, 'self_employed', { regime: 'skala' })).toBe(genericSummaryPack);
    expect(resolvePack('PL', 2025, 'self_employed')).toBe(genericSummaryPack);
    expect(resolvePack('PL', 2026, 'self_employed', { regime: 'liniowy' })).toBe(genericSummaryPack);
  });

  it('converts Polish amounts at the NBP previous-business-day rate, others at the transaction date', () => {
    expect(fxRuleFor('pl')).toBe('nbp_previous_business_day');
    expect(fxRuleFor('DE')).toBe('transaction_date');
  });
});

describe('NBP rates', () => {
  const rates = [
    { effectiveDate: '2025-01-02', mid: 4.27 },
    { effectiveDate: '2025-01-03', mid: 4.28 },
    { effectiveDate: '2025-01-07', mid: 4.26 },
  ];

  it('takes the last business day strictly before the date', () => {
    expect(previousBusinessDayRate(rates, '2025-01-03')?.mid).toBe(4.27);
    // Weekend and the 6 January holiday are skipped back to Friday the 3rd.
    expect(previousBusinessDayRate(rates, '2025-01-07')?.mid).toBe(4.28);
    expect(previousBusinessDayRate(rates, '2025-02-01')?.mid).toBe(4.26);
    expect(previousBusinessDayRate(rates, '2025-01-02')).toBeNull();
  });

  it('splits a range into windows of at most 93 days without gaps', () => {
    const windows = splitIntoWindows('2024-12-01', '2025-12-31');

    expect(windows[0]).toEqual(['2024-12-01', '2025-03-03']);
    expect(windows.at(-1)?.[1]).toBe('2025-12-31');
    expect(windows).toHaveLength(5);
  });
});

describe('filing info', () => {
  it('names the Polish form by regime and taxpayer type', () => {
    expect(filingInfoFor('PL', 2025, 'self_employed', { regime: 'ryczalt' })).toMatchObject({
      formName: 'PIT-28',
      filingOpens: '2026-02-15',
      deadlines: [{ kind: 'standard', date: '2026-04-30' }],
      authorityPreparation: 'prepared_needs_confirmation',
    });
    expect(filingInfoFor('pl', 2025, 'employee', {})).toMatchObject({
      formName: 'PIT-37',
      authorityPreparation: 'becomes_final',
    });
  });

  it('has verified entries only, for 2025 only', () => {
    expect(filingInfoFor('SI', 2025, 'self_employed', {})?.authorityPreparation).toBe('becomes_final');
    expect(filingInfoFor('CZ', 2025, 'self_employed', {})?.deadlines).toHaveLength(3);
    expect(filingInfoFor('NL', 2025, 'self_employed', {})).toBeNull();
    expect(filingInfoFor('AT', 2026, 'self_employed', {})).toBeNull();
  });
});
