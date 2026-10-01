/**
 * The cash-flow map as a pure function over already-converted rows: income
 * by source → total → categories → subcategories, a treemap of the same
 * tree, and a per-category comparison with the previous period.
 */

export interface CashFlowRow {
  /** Positive income, positive expense; direction is in `type`. */
  amount: number;
  type: 'income' | 'expense';
  categoryId: string | null;
  counterpartyName: string | null;
  /** True for rows the aggregates normally skip (transfers, investment contributions). */
  isTransfer: boolean;
}

export interface CategoryNode {
  id: string;
  name: string;
  parentId: string | null;
}

export interface CashFlowCategory {
  id: string;
  name: string;
  amount: number;
  previousAmount: number | null;
  children: Array<{ id: string; name: string; amount: number; previousAmount: number | null }>;
}

export interface CashFlowMap {
  income: { total: number; sources: Array<{ name: string; amount: number }> };
  expense: { total: number; categories: CashFlowCategory[] };
  transfers: number;
  net: number;
  previous: { income: number; expense: number; net: number } | null;
  sankey: {
    nodes: Array<{
      id: string;
      name: string;
      kind: 'source' | 'total' | 'category' | 'subcategory' | 'transfers';
    }>;
    links: Array<{ source: string; target: string; value: number }>;
  };
  treemap: Array<{
    id: string;
    name: string;
    value: number;
    children: Array<{ id: string; name: string; value: number }>;
  }>;
}

export interface CashFlowMapOptions {
  labels: { uncategorised: string; otherSources: string; total: string; transfers: string };
  /** How many income payers get their own node before the rest is rolled up. */
  maxSources?: number;
}

export function buildCashFlowMap(
  rows: CashFlowRow[],
  previousRows: CashFlowRow[] | null,
  categories: CategoryNode[],
  options: CashFlowMapOptions,
): CashFlowMap {
  const byId = new Map(categories.map(category => [category.id, category]));
  const rootOf = (id: string | null): string | null => {
    let current = id ? byId.get(id) : undefined;
    let guard = 0;
    while (current?.parentId && guard < 10) {
      const parent = byId.get(current.parentId);
      if (!parent) break;
      current = parent;
      guard += 1;
    }
    return current?.id ?? null;
  };
  const nameOf = (id: string | null): string =>
    id ? (byId.get(id)?.name ?? options.labels.uncategorised) : options.labels.uncategorised;

  const sumExpenses = (input: CashFlowRow[]) => {
    const roots = new Map<string, number>();
    const leaves = new Map<string, Map<string, number>>();
    for (const row of input) {
      if (row.type !== 'expense' || row.isTransfer) continue;
      const rootId = rootOf(row.categoryId) ?? '__none__';
      roots.set(rootId, (roots.get(rootId) ?? 0) + row.amount);
      const leafId = row.categoryId ?? '__none__';
      if (leafId !== rootId) {
        const bucket = leaves.get(rootId) ?? new Map<string, number>();
        bucket.set(leafId, (bucket.get(leafId) ?? 0) + row.amount);
        leaves.set(rootId, bucket);
      }
    }
    return { roots, leaves };
  };

  const current = sumExpenses(rows);
  const previous = previousRows ? sumExpenses(previousRows) : null;

  const categoriesOut: CashFlowCategory[] = [...current.roots.entries()]
    .map(([rootId, amount]) => {
      const previousBucket = previous?.leaves.get(rootId);
      const children = [...(current.leaves.get(rootId)?.entries() ?? [])]
        .map(([leafId, leafAmount]) => ({
          id: leafId,
          name: nameOf(leafId === '__none__' ? null : leafId),
          amount: round(leafAmount),
          previousAmount: previous ? round(previousBucket?.get(leafId) ?? 0) : null,
        }))
        .sort((a, b) => b.amount - a.amount);
      return {
        id: rootId,
        name: nameOf(rootId === '__none__' ? null : rootId),
        amount: round(amount),
        previousAmount: previous ? round(previous.roots.get(rootId) ?? 0) : null,
        children,
      };
    })
    .sort((a, b) => b.amount - a.amount);
  // Categories that had spending last period but none now still belong in the comparison.
  if (previous) {
    for (const [rootId, amount] of previous.roots) {
      if (current.roots.has(rootId)) continue;
      categoriesOut.push({
        id: rootId,
        name: nameOf(rootId === '__none__' ? null : rootId),
        amount: 0,
        previousAmount: round(amount),
        children: [],
      });
    }
  }

  const incomeBySource = new Map<string, number>();
  let incomeTotal = 0;
  let transfers = 0;
  for (const row of rows) {
    if (row.isTransfer) {
      transfers += row.amount;
      continue;
    }
    if (row.type !== 'income') continue;
    incomeTotal += row.amount;
    const key = (row.counterpartyName ?? '').trim() || options.labels.uncategorised;
    incomeBySource.set(key, (incomeBySource.get(key) ?? 0) + row.amount);
  }
  const maxSources = options.maxSources ?? 6;
  const sortedSources = [...incomeBySource.entries()].sort((a, b) => b[1] - a[1]);
  const sources = sortedSources
    .slice(0, maxSources)
    .map(([name, amount]) => ({ name, amount: round(amount) }));
  const tail = sortedSources.slice(maxSources).reduce((sum, [, amount]) => sum + amount, 0);
  if (tail > 0) sources.push({ name: options.labels.otherSources, amount: round(tail) });

  const expenseTotal = categoriesOut.reduce((sum, category) => sum + category.amount, 0);
  const previousIncome = previousRows
    ? previousRows
        .filter(row => row.type === 'income' && !row.isTransfer)
        .reduce((s, r) => s + r.amount, 0)
    : null;
  const previousExpense = previous ? [...previous.roots.values()].reduce((s, v) => s + v, 0) : null;

  // Sankey: sources → total → root categories → subcategories (+ transfers out of total).
  const nodes: CashFlowMap['sankey']['nodes'] = [];
  const links: CashFlowMap['sankey']['links'] = [];
  const totalId = 'total';
  nodes.push({ id: totalId, name: options.labels.total, kind: 'total' });
  for (const source of sources) {
    const id = `source:${source.name}`;
    nodes.push({ id, name: source.name, kind: 'source' });
    links.push({ source: id, target: totalId, value: source.amount });
  }
  for (const category of categoriesOut) {
    if (category.amount <= 0) continue;
    const id = `cat:${category.id}`;
    nodes.push({ id, name: category.name, kind: 'category' });
    links.push({ source: totalId, target: id, value: category.amount });
    for (const child of category.children) {
      if (child.amount <= 0) continue;
      const childId = `sub:${child.id}`;
      nodes.push({ id: childId, name: child.name, kind: 'subcategory' });
      links.push({ source: id, target: childId, value: child.amount });
    }
  }
  if (transfers > 0) {
    nodes.push({ id: 'transfers', name: options.labels.transfers, kind: 'transfers' });
    links.push({ source: totalId, target: 'transfers', value: round(transfers) });
  }

  return {
    income: { total: round(incomeTotal), sources },
    expense: { total: round(expenseTotal), categories: categoriesOut },
    transfers: round(transfers),
    net: round(incomeTotal - expenseTotal),
    previous:
      previousIncome !== null && previousExpense !== null
        ? {
            income: round(previousIncome),
            expense: round(previousExpense),
            net: round(previousIncome - previousExpense),
          }
        : null,
    sankey: { nodes, links },
    treemap: categoriesOut
      .filter(category => category.amount > 0)
      .map(category => ({
        id: category.id,
        name: category.name,
        value: category.amount,
        children: category.children
          .filter(child => child.amount > 0)
          .map(child => ({ id: child.id, name: child.name, value: child.amount })),
      })),
  };
}

/** The same length of time right before `from`. */
export function previousPeriod(from: string, to: string): { from: string; to: string } {
  const start = parse(from);
  const end = parse(to);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const prevEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
  const prevStart = new Date(
    prevEnd.getFullYear(),
    prevEnd.getMonth(),
    prevEnd.getDate() - days + 1,
  );
  return { from: format(prevStart), to: format(prevEnd) };
}

/** CSV of the comparison table, one row per category and subcategory. */
export function cashFlowMapToCsv(map: CashFlowMap, currency: string): string {
  const lines = [
    ['category', 'subcategory', `amount_${currency}`, `previous_${currency}`, 'delta'].join(','),
  ];
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const row = (category: string, sub: string, amount: number, previous: number | null) =>
    [
      cell(category),
      cell(sub),
      amount.toFixed(2),
      previous === null ? '' : previous.toFixed(2),
      previous === null ? '' : (amount - previous).toFixed(2),
    ].join(',');
  for (const category of map.expense.categories) {
    lines.push(row(category.name, '', category.amount, category.previousAmount));
    for (const child of category.children) {
      lines.push(row(category.name, child.name, child.amount, child.previousAmount));
    }
  }
  return `${lines.join('\n')}\n`;
}

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function format(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
