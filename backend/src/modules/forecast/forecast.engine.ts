/**
 * Cash-flow forecast as a pure function over dated money events, so it can be
 * tested with fixed inputs and reasoned about without a database.
 *
 * Three layers, each one a step less certain than the last:
 * 1. committed events — bills, subscriptions, invoices, planned goal
 *    contributions, each on its day;
 * 2. recurring income — paydays detected from history;
 * 3. the everyday spending average — what history says leaves the account
 *    between the known items, spread evenly over the days.
 *
 * "Safe to spend" uses layers 1 and 2 only: the everyday average is exactly
 * the money the person is about to spend, so it must not be subtracted from
 * what they may spend.
 */

export type ForecastEventKind =
  | 'payable'
  | 'subscription'
  | 'invoice'
  | 'goal'
  | 'income'
  | 'scenario';

export interface ForecastEvent {
  /** YYYY-MM-DD */
  date: string;
  label: string;
  /** Positive = money in, negative = money out. Workspace currency. */
  amount: number;
  kind: ForecastEventKind;
  /** The row behind the event; `exclude` in a scenario names these. */
  sourceId: string;
  isOverdue?: boolean;
}

export interface ForecastScenario {
  /** Source ids to leave out ("what if I cancel X"). */
  exclude?: string[];
  /** Multiplier on every inflow (0.8 = income down 20%). */
  incomeFactor?: number;
  /** Multiplier on every outflow and on the everyday average. */
  expenseFactor?: number;
  /** One-off events the person adds by hand ("a 2,000 repair on the 15th"). */
  extraEvents?: Array<Pick<ForecastEvent, 'date' | 'label' | 'amount'>>;
}

export interface ForecastInput {
  /** YYYY-MM-DD, day zero of the projection. */
  today: string;
  horizonDays: number;
  openingBalance: number;
  events: ForecastEvent[];
  /** Everyday spending per month, from history, net of the committed items. */
  everydayMonthly: number;
  scenario?: ForecastScenario;
}

export interface ForecastDay {
  date: string;
  inflow: number;
  outflow: number;
  everyday: number;
  balance: number;
}

export interface ForecastResult {
  horizonDays: number;
  openingBalance: number;
  closingBalance: number;
  totalInflow: number;
  totalOutflow: number;
  totalEveryday: number;
  days: ForecastDay[];
  events: ForecastEvent[];
  lowestBalance: number;
  lowestBalanceDate: string;
  /** First day the projected balance goes negative, or null. */
  shortfallDate: string | null;
  /** Committed items and paydays only, until the next payday (or the horizon). */
  safeToSpend: { amount: number; untilDate: string; nextIncomeDate: string | null };
  /** Months the opening balance lasts at the historical burn; null when not burning. */
  runwayMonths: number | null;
}

const DAYS_PER_MONTH = 365.25 / 12;

export function computeForecast(input: ForecastInput): ForecastResult {
  const horizonDays = Math.max(1, Math.trunc(input.horizonDays));
  const scenario = input.scenario ?? {};
  const excluded = new Set(scenario.exclude ?? []);
  const incomeFactor = factor(scenario.incomeFactor);
  const expenseFactor = factor(scenario.expenseFactor);
  const horizonEnd = addDays(input.today, horizonDays - 1);

  const events: ForecastEvent[] = [
    ...input.events.filter(event => !excluded.has(event.sourceId)),
    ...(scenario.extraEvents ?? []).map((event, index) => ({
      ...event,
      kind: 'scenario' as const,
      sourceId: `scenario:${index}`,
    })),
  ]
    .filter(event => event.date >= input.today && event.date <= horizonEnd)
    .map(event => ({
      ...event,
      amount: round(event.amount * (event.amount > 0 ? incomeFactor : expenseFactor)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const inflowByDate = new Map<string, number>();
  const outflowByDate = new Map<string, number>();
  for (const event of events) {
    const bucket = event.amount > 0 ? inflowByDate : outflowByDate;
    bucket.set(event.date, (bucket.get(event.date) ?? 0) + Math.abs(event.amount));
  }

  const everydayDaily = (Math.max(0, input.everydayMonthly) * expenseFactor) / DAYS_PER_MONTH;
  const days: ForecastDay[] = [];
  let balance = input.openingBalance;
  let totalInflow = 0;
  let totalOutflow = 0;
  let totalEveryday = 0;
  let lowestBalance = input.openingBalance;
  let lowestBalanceDate = input.today;
  let shortfallDate: string | null = null;

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const date = addDays(input.today, offset);
    const inflow = inflowByDate.get(date) ?? 0;
    const outflow = outflowByDate.get(date) ?? 0;
    balance += inflow - outflow - everydayDaily;
    totalInflow += inflow;
    totalOutflow += outflow;
    totalEveryday += everydayDaily;
    const rounded = round(balance);
    if (rounded < lowestBalance) {
      lowestBalance = rounded;
      lowestBalanceDate = date;
    }
    if (shortfallDate === null && rounded < 0) {
      shortfallDate = date;
    }
    days.push({
      date,
      inflow: round(inflow),
      outflow: round(outflow),
      everyday: round(everydayDaily),
      balance: rounded,
    });
  }

  return {
    horizonDays,
    openingBalance: round(input.openingBalance),
    closingBalance: round(balance),
    totalInflow: round(totalInflow),
    totalOutflow: round(totalOutflow),
    totalEveryday: round(totalEveryday),
    days,
    events,
    lowestBalance: round(lowestBalance),
    lowestBalanceDate,
    shortfallDate,
    safeToSpend: safeToSpend(input.today, horizonEnd, input.openingBalance, events),
    runwayMonths: runwayMonths(input.openingBalance, balance, horizonDays),
  };
}

/**
 * Cash now, minus every committed outflow before the next payday, plus any
 * committed inflow that lands first. Never below zero: "nothing" is the
 * honest answer, a negative number is not.
 */
function safeToSpend(
  today: string,
  horizonEnd: string,
  openingBalance: number,
  events: ForecastEvent[],
): ForecastResult['safeToSpend'] {
  const nextIncome = events.find(event => event.kind === 'income' && event.date > today);
  const untilDate = nextIncome ? addDays(nextIncome.date, -1) : horizonEnd;
  let balance = openingBalance;
  let lowest = openingBalance;
  for (const event of events) {
    if (event.date > untilDate) break;
    balance += event.amount;
    lowest = Math.min(lowest, balance);
  }
  return {
    amount: round(Math.max(0, lowest)),
    untilDate,
    nextIncomeDate: nextIncome?.date ?? null,
  };
}

/**
 * How many months the balance lasts at the pace the projection falls over the
 * horizon — the same line the chart draws, so the two never disagree. Null
 * when the projection does not fall.
 */
function runwayMonths(
  openingBalance: number,
  closingBalance: number,
  horizonDays: number,
): number | null {
  const monthlyDecline = (openingBalance - closingBalance) / (horizonDays / DAYS_PER_MONTH);
  if (!(monthlyDecline > 0) || openingBalance <= 0) return null;
  return round(openingBalance / monthlyDecline);
}

function factor(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 1;
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(year, month - 1, day + days);
  return formatDateOnly(result);
}

export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/* ------------------------------------------------------------------------ */
/* Recurring income                                                           */
/* ------------------------------------------------------------------------ */

export interface IncomeRow {
  counterpartyName: string | null;
  amount: number;
  /** YYYY-MM-DD or Date */
  transactionDate: string | Date;
}

export interface RecurringIncome {
  label: string;
  amount: number;
  intervalDays: number;
  lastDate: string;
  nextDate: string;
  occurrences: number;
}

/**
 * Paydays from history: one payer, at least three deposits, roughly regular
 * (weekly, fortnightly or monthly), amounts within 25% of their median. The
 * next date is the last one plus the median interval, rolled forward past
 * `today`.
 */
export function detectRecurringIncome(rows: IncomeRow[], today: string): RecurringIncome[] {
  const groups = new Map<string, IncomeRow[]>();
  for (const row of rows) {
    const key = (row.counterpartyName ?? '').trim().toLowerCase();
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const result: RecurringIncome[] = [];
  for (const group of groups.values()) {
    const sorted = group
      .map(row => ({ ...row, date: toDateOnly(row.transactionDate) }))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length < 3) continue;
    const intervals = sorted.slice(1).map((row, i) => daysBetween(sorted[i].date, row.date));
    const interval = median(intervals);
    if (interval < 6 || interval > 35) continue;
    if (intervals.some(value => Math.abs(value - interval) > Math.max(3, interval * 0.25)))
      continue;
    const amounts = sorted.map(row => Math.abs(Number(row.amount)));
    const amount = median(amounts);
    if (amounts.some(value => Math.abs(value - amount) > amount * 0.25)) continue;
    const last = sorted[sorted.length - 1];
    let next = addDays(last.date, Math.round(interval));
    let guard = 0;
    while (next <= today && guard < 60) {
      next = addDays(next, Math.round(interval));
      guard += 1;
    }
    result.push({
      label: (last.counterpartyName ?? '').trim(),
      amount: round(amount),
      intervalDays: Math.round(interval),
      lastDate: last.date,
      nextDate: next,
      occurrences: sorted.length,
    });
  }
  return result;
}

/** Every payday of `income` inside [today, horizonEnd] as inflow events. */
export function projectIncome(
  income: RecurringIncome,
  sourceId: string,
  today: string,
  horizonEnd: string,
): ForecastEvent[] {
  const events: ForecastEvent[] = [];
  let date = income.nextDate;
  let guard = 0;
  while (date <= horizonEnd && guard < 400) {
    if (date >= today) {
      events.push({ date, label: income.label, amount: income.amount, kind: 'income', sourceId });
    }
    date = addDays(date, income.intervalDays);
    guard += 1;
  }
  return events;
}

function toDateOnly(value: string | Date): string {
  if (value instanceof Date) return formatDateOnly(value);
  return value.slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
