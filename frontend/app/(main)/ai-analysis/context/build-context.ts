import { estimateTokens } from './token-budget';

/**
 * Assembles the workspace summary that goes into the model's prompt.
 *
 * Structural labels are English while the data (category and merchant names)
 * stays in whatever language the workspace uses. The packet is read by the
 * model, not by a person, and these models follow English structure most
 * reliably — translating the scaffolding would cost tokens and gain nothing.
 */

export interface Snapshot {
  totalBalance: number;
  income30d: number;
  expense30d: number;
  netFlow30d: number;
  currency: string;
}

export interface NamedAmount {
  name: string;
  amount: number;
  count: number;
}

export interface CashFlowPoint {
  date: string;
  income: number;
  expense: number;
}

export interface RetrievedTransaction {
  transactionId: string;
  counterpartyName: string;
  paymentPurpose: string;
  transactionDate: string;
  amount: number | null;
  currency: string;
}

export interface ContextInput {
  snapshot: Snapshot;
  topCategories: NamedAmount[];
  topMerchants: NamedAmount[];
  incomeSources: NamedAmount[];
  cashFlow: CashFlowPoint[];
  uncategorizedTransactions: number;
  /** Rows retrieved for this specific question, if any. */
  retrieved?: RetrievedTransaction[];
}

export interface ContextPacket {
  text: string;
  usedTokens: number;
  budgetTokens: number;
  /** Sections that did not fit, so the caller can say so instead of implying completeness. */
  droppedSections: string[];
  /** Sections included with fewer rows than available. */
  trimmedSections: string[];
}

function money(value: number, currency: string): string {
  return `${Math.round(value).toLocaleString('en-US')} ${currency}`;
}

function renderList(title: string, rows: NamedAmount[], limit: number, currency: string): string {
  const lines = rows
    .slice(0, limit)
    .map(row => `- ${row.name}: ${money(row.amount, currency)} (${row.count})`);

  return `${title}:\n${lines.join('\n')}`;
}

/** Daily points would eat the whole budget; months carry the same trend. */
function toMonthly(
  points: CashFlowPoint[],
): Array<{ month: string; income: number; expense: number }> {
  const byMonth = new Map<string, { income: number; expense: number }>();

  for (const point of points) {
    const month = point.date.slice(0, 7);
    const bucket = byMonth.get(month) ?? { income: 0, expense: 0 };
    bucket.income += point.income;
    bucket.expense += point.expense;
    byMonth.set(month, bucket);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, totals]) => ({ month, ...totals }));
}

interface Variant {
  text: string;
  /** How many rows this rendering shows, so trimming can be reported honestly. */
  rows: number;
}

interface Section {
  name: string;
  /** Candidate renderings, widest first. The first that fits is used. */
  variants: Variant[];
  /** How many rows exist in total. */
  fullSize: number;
}

/** Builds the widest-first variants for a list section from one set of limits. */
function listVariants(
  title: string,
  rows: NamedAmount[],
  limits: number[],
  currency: string,
): Variant[] {
  return limits.map(limit => ({
    text: renderList(title, rows, limit, currency),
    rows: Math.min(limit, rows.length),
  }));
}

function buildSections(input: ContextInput): Section[] {
  const { currency } = input.snapshot;
  const sections: Section[] = [];

  sections.push({
    name: 'snapshot',
    fullSize: 1,
    variants: [
      {
        rows: 1,
        text: [
          'Workspace summary (last 30 days):',
          `- balance: ${money(input.snapshot.totalBalance, currency)}`,
          `- income: ${money(input.snapshot.income30d, currency)}`,
          `- expense: ${money(input.snapshot.expense30d, currency)}`,
          `- net: ${money(input.snapshot.netFlow30d, currency)}`,
        ].join('\n'),
      },
    ],
  });

  // Placed right after the snapshot: these rows were chosen for this question,
  // so they earn their tokens ahead of the general aggregates.
  const retrieved = input.retrieved ?? [];
  if (retrieved.length > 0) {
    sections.push({
      name: 'retrieved',
      fullSize: retrieved.length,
      variants: [8, 5, 3].map(limit => ({
        rows: Math.min(limit, retrieved.length),
        text: [
          'Transactions matching the question:',
          ...retrieved
            .slice(0, limit)
            .map(
              row =>
                `- ${row.transactionDate} ${row.counterpartyName}: ${
                  row.amount === null ? 'n/a' : money(row.amount, row.currency)
                }${row.paymentPurpose ? ` — ${row.paymentPurpose}` : ''}`,
            ),
        ].join('\n'),
      })),
    });
  }

  if (input.topCategories.length > 0) {
    sections.push({
      name: 'categories',
      fullSize: input.topCategories.length,
      variants: listVariants(
        'Top expense categories',
        input.topCategories,
        [25, 12, 8, 5, 3],
        currency,
      ),
    });
  }

  if (input.topMerchants.length > 0) {
    sections.push({
      name: 'merchants',
      fullSize: input.topMerchants.length,
      variants: listVariants('Top merchants', input.topMerchants, [20, 10, 6, 3], currency),
    });
  }

  const monthly = toMonthly(input.cashFlow);
  if (monthly.length > 0) {
    sections.push({
      name: 'cashflow',
      fullSize: monthly.length,
      variants: [12, 6, 3].map(limit => ({
        rows: Math.min(limit, monthly.length),
        text: [
          'Monthly cash flow:',
          ...monthly
            .slice(-limit)
            .map(
              row =>
                `- ${row.month}: +${money(row.income, currency)} / -${money(row.expense, currency)}`,
            ),
        ].join('\n'),
      })),
    });
  }

  if (input.incomeSources.length > 0) {
    sections.push({
      name: 'income',
      fullSize: input.incomeSources.length,
      variants: listVariants('Top income sources', input.incomeSources, [15, 8, 5, 3], currency),
    });
  }

  if (input.uncategorizedTransactions > 0) {
    sections.push({
      name: 'dataHealth',
      fullSize: 1,
      variants: [
        {
          rows: 1,
          text: `Data caveat: ${input.uncategorizedTransactions} transactions are uncategorised, so category totals understate reality.`,
        },
      ],
    });
  }

  return sections;
}

/**
 * Fills the budget greedily in priority order. A section that cannot fit even at
 * its smallest is dropped and reported rather than silently truncated mid-line,
 * which would leave the model reading a half-written number.
 */
export function buildContextPacket(input: ContextInput, budgetTokens: number): ContextPacket {
  const sections = buildSections(input);
  const parts: string[] = [];
  const dropped: string[] = [];
  const trimmed: string[] = [];
  let used = 0;

  for (const section of sections) {
    const separatorCost = parts.length > 0 ? estimateTokens('\n\n') : 0;
    let placed = false;

    for (const variant of section.variants) {
      const cost = estimateTokens(variant.text) + separatorCost;
      if (used + cost <= budgetTokens) {
        parts.push(variant.text);
        used += cost;
        placed = true;
        if (variant.rows < section.fullSize) {
          trimmed.push(section.name);
        }
        break;
      }
    }

    if (!placed) {
      dropped.push(section.name);
    }
  }

  return {
    text: parts.join('\n\n'),
    usedTokens: used,
    budgetTokens,
    droppedSections: dropped,
    trimmedSections: trimmed,
  };
}
