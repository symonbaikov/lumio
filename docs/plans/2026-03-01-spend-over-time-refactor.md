# Spend Over Time Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure Spend over time shows data by default and KPIs reflect spend correctly.

**Architecture:** Adjust frontend defaults and query building to request all data within year-to-date by default, and align backend KPI math with displayed labels.

**Tech Stack:** Next.js (frontend), NestJS (backend), Vitest, Jest.

---

### Task 1: Default Spend Over Time API query

**Files:**
- Modify: `frontend/app/lib/__tests__/spend-over-time-api.test.ts`
- Modify: `frontend/app/lib/spend-over-time-api.ts`

**Step 1: Write the failing test**

```ts
import { vi } from 'vitest';

it('defaults to all flow and year-to-date dates', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-02-15T10:00:00.000Z'));

  const query = buildSpendOverTimeQuery(DEFAULT_STATEMENT_FILTERS, 'month');

  expect(query).toEqual({
    type: 'all',
    groupBy: 'month',
    dateFrom: '2026-01-01',
    dateTo: '2026-02-15',
  });

  vi.useRealTimers();
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- spend-over-time-api.test.ts`
Expected: FAIL (type is expense and date range missing)

**Step 3: Write minimal implementation**

```ts
const resolveReportType = (...) => {
  ...
  return 'all';
};

const dateRange = resolvePresetRange(filters.date?.preset ?? 'yearToDate');
Object.assign(query, dateRange);
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- spend-over-time-api.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/lib/__tests__/spend-over-time-api.test.ts frontend/app/lib/spend-over-time-api.ts
git commit -m "fix(frontend): default spend over time query"
```

---

### Task 2: Default flow and filter state UX

**Files:**
- Modify: `frontend/app/(main)/statements/components/SpendOverTimeView.test.tsx`
- Modify: `frontend/app/(main)/statements/components/SpendOverTimeView.tsx`

**Step 1: Write the failing tests**

```tsx
it('defaults flow to all', async () => {
  render(<SpendOverTimeView />);
  expect(screen.getByRole('button', { name: /flow: all/i })).toBeInTheDocument();
});

it('does not count default flow as active filter', async () => {
  render(<SpendOverTimeView />);
  expect(screen.queryByText('1')).not.toBeInTheDocument();
});

it('clears stored filters on reset', async () => {
  localStorage.setItem('finflow-spend-over-time-filters', JSON.stringify({ ... }));
  render(<SpendOverTimeView />);
  userEvent.click(screen.getByRole('button', { name: /reset filters/i }));
  expect(localStorage.getItem('finflow-spend-over-time-filters')).toBeNull();
});
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- SpendOverTimeView.test.tsx`
Expected: FAIL (flow defaults to expense, active count includes flow, storage unchanged)

**Step 3: Write minimal implementation**

```ts
const DEFAULT_FLOW: FlowFilterValue = 'all';

if (appliedFilters.type && appliedFilters.type !== DEFAULT_FLOW) count += 1;

const resetAllFilters = () => {
  ...
  localStorage.removeItem(STORAGE_KEY);
};
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- SpendOverTimeView.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/(main)/statements/components/SpendOverTimeView.test.tsx frontend/app/(main)/statements/components/SpendOverTimeView.tsx
git commit -m "fix(frontend): improve spend over time defaults"
```

---

### Task 3: Correct avg per period calculation

**Files:**
- Modify: `backend/@tests/unit/modules/reports/reports.service.spec.ts`
- Modify: `backend/src/modules/reports/reports.service.ts`

**Step 1: Write the failing test**

```ts
expect(result.totals.avgPerPeriod).toBeCloseTo(20 / 3, 5);
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- reports.service.spec.ts`
Expected: FAIL (avgPerPeriod uses net)

**Step 3: Write minimal implementation**

```ts
const avgPerPeriod = points.length ? totals.expense / points.length : 0;
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- reports.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/@tests/unit/modules/reports/reports.service.spec.ts backend/src/modules/reports/reports.service.ts
git commit -m "fix(reports): avg spend per period"
```
