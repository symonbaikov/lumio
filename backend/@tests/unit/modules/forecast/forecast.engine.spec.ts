import {
  addDays,
  computeForecast,
  detectRecurringIncome,
  type ForecastEvent,
  projectIncome,
} from '@/modules/forecast/forecast.engine';

const today = '2026-10-01';
const event = (date: string, amount: number, extra: Partial<ForecastEvent> = {}): ForecastEvent => ({
  date,
  amount,
  label: extra.label ?? (amount > 0 ? 'Pay' : 'Bill'),
  kind: extra.kind ?? (amount > 0 ? 'income' : 'payable'),
  sourceId: extra.sourceId ?? `${date}:${amount}`,
  ...extra,
});

describe('computeForecast', () => {
  it('drains the balance by committed items and the everyday average, and finds the low point', () => {
    const result = computeForecast({
      today,
      horizonDays: 10,
      openingBalance: 1000,
      events: [event('2026-10-03', -400), event('2026-10-08', 900)],
      everydayMonthly: 304.375, // 10 a day
      monthlyNet: 0,
    });

    expect(result.days).toHaveLength(10);
    expect(result.days[0].balance).toBe(990);
    expect(result.days[2]).toMatchObject({ date: '2026-10-03', outflow: 400, balance: 570 });
    expect(result.lowestBalance).toBe(530);
    expect(result.lowestBalanceDate).toBe('2026-10-07');
    expect(result.days[7]).toMatchObject({ inflow: 900, balance: 1420 });
    expect(result.closingBalance).toBe(1400);
    expect(result.totalOutflow).toBe(400);
    expect(result.totalInflow).toBe(900);
    expect(result.shortfallDate).toBeNull();
  });

  it('names the first day the balance goes negative', () => {
    const result = computeForecast({
      today,
      horizonDays: 5,
      openingBalance: 100,
      events: [event('2026-10-02', -80), event('2026-10-04', -50)],
      everydayMonthly: 0,
      monthlyNet: 0,
    });
    expect(result.shortfallDate).toBe('2026-10-04');
    expect(result.lowestBalance).toBe(-30);
  });

  it('keeps safe-to-spend to committed items until the next payday and never below zero', () => {
    const result = computeForecast({
      today,
      horizonDays: 30,
      openingBalance: 500,
      events: [event('2026-10-05', -200), event('2026-10-10', 2000), event('2026-10-12', -900)],
      everydayMonthly: 3000, // would eat everything, must not count
      monthlyNet: 0,
    });
    expect(result.safeToSpend).toEqual({
      amount: 300,
      untilDate: '2026-10-09',
      nextIncomeDate: '2026-10-10',
    });

    const broke = computeForecast({
      today,
      horizonDays: 30,
      openingBalance: 100,
      events: [event('2026-10-05', -200), event('2026-10-10', 2000)],
      everydayMonthly: 0,
      monthlyNet: 0,
    });
    expect(broke.safeToSpend.amount).toBe(0);
  });

  it('applies a scenario: dropped sources, income down, costs up, a one-off repair', () => {
    const result = computeForecast({
      today,
      horizonDays: 20,
      openingBalance: 1000,
      events: [
        event('2026-10-02', -100, { sourceId: 'netflix', kind: 'subscription' }),
        event('2026-10-03', -100, { sourceId: 'rent' }),
        event('2026-10-10', 1000, { sourceId: 'salary' }),
      ],
      everydayMonthly: 0,
      monthlyNet: 0,
      scenario: {
        exclude: ['netflix'],
        incomeFactor: 0.8,
        expenseFactor: 1.5,
        extraEvents: [{ date: '2026-10-15', label: 'Car repair', amount: -300 }],
      },
    });
    expect(result.events.map(item => [item.sourceId, item.amount])).toEqual([
      ['rent', -150],
      ['salary', 800],
      ['scenario:0', -450],
    ]);
    expect(result.closingBalance).toBe(1200);
  });

  it('reads the runway off the historical burn and says nothing when not burning', () => {
    const burning = computeForecast({
      today,
      horizonDays: 1,
      openingBalance: 12000,
      events: [],
      everydayMonthly: 0,
      monthlyNet: -4000,
    });
    expect(burning.runwayMonths).toBe(3);

    const growing = computeForecast({
      today,
      horizonDays: 1,
      openingBalance: 12000,
      events: [],
      everydayMonthly: 0,
      monthlyNet: 500,
    });
    expect(growing.runwayMonths).toBeNull();
  });
});

describe('detectRecurringIncome', () => {
  it('finds a monthly salary and projects its paydays past today', () => {
    const rows = ['2026-06-25', '2026-07-25', '2026-08-25', '2026-09-25'].map(date => ({
      counterpartyName: 'ACME GmbH',
      amount: 3000,
      transactionDate: date,
    }));
    const [salary] = detectRecurringIncome(rows, today);
    expect(salary).toMatchObject({ label: 'ACME GmbH', amount: 3000, intervalDays: 31 });
    expect(salary.nextDate).toBe('2026-10-26');

    const paydays = projectIncome(salary, 'income:0', today, '2026-12-31');
    expect(paydays.map(item => item.date)).toEqual(['2026-10-26', '2026-11-26', '2026-12-27']);
  });

  it('ignores one-off deposits and irregular payers', () => {
    const rows = [
      { counterpartyName: 'Refund', amount: 50, transactionDate: '2026-09-01' },
      { counterpartyName: 'Client A', amount: 1000, transactionDate: '2026-05-01' },
      { counterpartyName: 'Client A', amount: 4000, transactionDate: '2026-06-20' },
      { counterpartyName: 'Client A', amount: 1000, transactionDate: '2026-09-15' },
    ];
    expect(detectRecurringIncome(rows, today)).toEqual([]);
  });
});

describe('addDays', () => {
  it('crosses month and year ends in local time', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
