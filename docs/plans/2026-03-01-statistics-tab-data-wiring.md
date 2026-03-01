# Statistics Tab Data Wiring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire real data into the Statistics tab — connect the calendar/range filter to the `useDashboard` hook, fix the "Monthly" dropdowns, and make all five cards render live data from `GET /api/v1/dashboard`.

**Architecture:** All five Statistics cards already receive props from `useDashboard`. The gaps are: (1) `targetDate` and `range` state in `page.tsx` are not passed to `useDashboard`; (2) the "Monthly ▼" buttons on each card are dead UI; (3) chart data slicing is hardcoded. We wire the page-level state to the hook, replace "Monthly ▼" buttons with a shared period dropdown that maps to `7d`/`30d`/`90d`, and remove hardcoded slice limits.

**Tech Stack:** Next.js 14, React hooks, TypeScript, Recharts (already used in cards), axios via `apiClient`.

---

## Task 1: Wire `targetDate` into `useDashboard` in `page.tsx`

**Files:**
- Modify: `frontend/app/page.tsx` (lines ~44–50, ~303–330)

**Context:**
- `useDashboard` is called on line ~46 as `useDashboard('30d')` — `targetDate` returned but the hook doesn't receive it.
- `changeTargetDate` is returned from the hook but never called.
- The calendar popover sets local `targetDate` state but never calls `changeTargetDate`.

**Step 1: Read the current hook call and state declarations**

Open `frontend/app/page.tsx` lines 40–55 to confirm current shape.

**Step 2: Pass `targetDate` to `useDashboard`**

Change the hook destructure so the hook receives the current `targetDate`:

```tsx
// Before (approx line 46):
const { data, isLoading, changeRange, changeTargetDate } = useDashboard('30d');

// After:
const [targetDate, setTargetDate] = React.useState<string | null>(null);
const [range, setRange] = React.useState<DashboardRange>('30d');
const { data, isLoading } = useDashboard(range, targetDate ?? undefined);
```

Remove the duplicate `targetDate` useState that was previously separate.

**Step 3: Wire calendar onChange to `setTargetDate`**

Locate the calendar `onChange` handler (~line 287). Replace any call to `changeTargetDate` or standalone setter with:

```tsx
onChange={(val) => {
  const iso = val.toString(); // CalendarDate .toString() gives YYYY-MM-DD
  setTargetDate(iso);
}}
```

**Step 4: Run the dev server and verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 errors.

**Step 5: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "fix(statistics): wire targetDate to useDashboard hook"
```

---

## Task 2: Add `range` prop to `useDashboard` signature and verify it accepts external state

**Files:**
- Read: `frontend/app/hooks/useDashboard.ts` lines 1–160
- Modify: `frontend/app/hooks/useDashboard.ts` (if needed)

**Context:**
`useDashboard` currently accepts `(initialRange: DashboardRange)` and uses internal state. We want to make it accept an *optional controlled range* so page.tsx drives it externally.

**Step 1: Read the hook signature**

Open `frontend/app/hooks/useDashboard.ts` and note:
- Line where `range` state is declared
- Whether it already accepts a second `date` param

**Step 2: Update hook to accept controlled range + date**

If the hook currently only accepts `initialRange` and ignores external changes, update it to sync from props:

```ts
export function useDashboard(
  controlledRange: DashboardRange = '30d',
  controlledDate?: string,
) {
  const [range, setRange] = useState<DashboardRange>(controlledRange);
  const [targetDate, setTargetDate] = useState<string | undefined>(controlledDate);

  // Sync if parent changes the range from outside
  useEffect(() => { setRange(controlledRange); }, [controlledRange]);
  useEffect(() => { setTargetDate(controlledDate); }, [controlledDate]);
  // ... rest of hook unchanged
}
```

**Step 3: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 errors.

**Step 4: Commit**

```bash
git add frontend/app/hooks/useDashboard.ts
git commit -m "fix(statistics): accept controlled range and date in useDashboard"
```

---

## Task 3: Create a shared `PeriodDropdown` component

**Files:**
- Create: `frontend/app/components/dashboard/PeriodDropdown.tsx`

**Context:**
Every Statistics card has a dead "Monthly ▼" button. We need a real dropdown that maps "Weekly" → `7d`, "Monthly" → `30d`, "Quarterly" → `90d` and calls back with the selected `DashboardRange`.

**Step 1: Create the component file**

```tsx
// frontend/app/components/dashboard/PeriodDropdown.tsx
'use client';
import React, { useState, useRef, useEffect } from 'react';
import type { DashboardRange } from '../../hooks/useDashboard';

interface PeriodDropdownProps {
  value: DashboardRange;
  onChange: (range: DashboardRange) => void;
}

const LABELS: Record<DashboardRange, string> = {
  '7d': 'Weekly',
  '30d': 'Monthly',
  '90d': 'Quarterly',
};

export function PeriodDropdown({ value, onChange }: PeriodDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
        type="button"
      >
        {LABELS[value]} <span>▼</span>
      </button>
      {open && (
        <div
          style={{ position: 'absolute', right: 0, top: '100%', zIndex: 50 }}
          className="bg-white border border-gray-200 rounded shadow-md min-w-[120px] mt-1"
        >
          {(Object.entries(LABELS) as [DashboardRange, string][]).map(([range, label]) => (
            <button
              key={range}
              type="button"
              onClick={() => { onChange(range); setOpen(false); }}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                value === range ? 'font-semibold text-blue-600' : 'text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add frontend/app/components/dashboard/PeriodDropdown.tsx
git commit -m "feat(statistics): add PeriodDropdown component for range selection"
```

---

## Task 4: Lift `range` state to `page.tsx` and pass it to each Statistics card

**Files:**
- Modify: `frontend/app/page.tsx` (Statistics tab block, lines ~303–330)
- Modify: `frontend/app/components/dashboard/FinlabIncomeCard.tsx`
- Modify: `frontend/app/components/dashboard/FinlabExpenseCard.tsx`
- Modify: `frontend/app/components/dashboard/FinlabBalanceStatCard.tsx`
- Modify: `frontend/app/components/dashboard/FinlabExpenseCategoryCard.tsx`
- Modify: `frontend/app/components/dashboard/FinlabTransactionCard.tsx`

**Context:**
The `range` state created in Task 1 (`setRange`) must be passed as props to each card so they can render the `PeriodDropdown` and call back up.

**Step 1: Add `range` and `onRangeChange` props to each card's interface**

For each of the five card files, add to their props interface:
```tsx
range: DashboardRange;
onRangeChange: (range: DashboardRange) => void;
```

Import `DashboardRange` from `../../hooks/useDashboard`.

**Step 2: Replace dead "Monthly ▼" button with `PeriodDropdown` in each card**

In each card, replace:
```tsx
<button className="...">Monthly <span>▼</span></button>
```
with:
```tsx
import { PeriodDropdown } from './PeriodDropdown';
// ...
<PeriodDropdown value={range} onChange={onRangeChange} />
```

**Step 3: Update `page.tsx` to pass `range` and `setRange` to each card**

```tsx
<FinlabIncomeCard data={data.cashFlow} range={range} onRangeChange={setRange} />
<FinlabExpenseCard data={data.cashFlow} range={range} onRangeChange={setRange} />
<FinlabBalanceStatCard data={data.cashFlow} range={range} onRangeChange={setRange} />
<FinlabExpenseCategoryCard categories={data.topCategories} range={range} onRangeChange={setRange} />
<FinlabTransactionCard activities={data.recentActivity} range={range} onRangeChange={setRange} />
```

**Step 4: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 errors.

**Step 5: Commit**

```bash
git add frontend/app/page.tsx \
  frontend/app/components/dashboard/FinlabIncomeCard.tsx \
  frontend/app/components/dashboard/FinlabExpenseCard.tsx \
  frontend/app/components/dashboard/FinlabBalanceStatCard.tsx \
  frontend/app/components/dashboard/FinlabExpenseCategoryCard.tsx \
  frontend/app/components/dashboard/FinlabTransactionCard.tsx
git commit -m "feat(statistics): wire range dropdown to all Statistics cards"
```

---

## Task 5: Fix hardcoded data slicing in Income and Expense cards

**Files:**
- Modify: `frontend/app/components/dashboard/FinlabIncomeCard.tsx`
- Modify: `frontend/app/components/dashboard/FinlabExpenseCard.tsx`
- Modify: `frontend/app/components/dashboard/FinlabBalanceStatCard.tsx`

**Context:**
Each chart currently slices `data.slice(-5)` or `data.slice(-12)` regardless of range. With real data from `7d`/`30d`/`90d`, the number of data points varies (7, 30, or 90 days of daily points, or ~13 weeks for 90d).

**Step 1: Update slice logic in FinlabIncomeCard**

Replace hardcoded `.slice(-5)` with a range-aware slice:
```tsx
const SLICE: Record<DashboardRange, number> = { '7d': 7, '30d': 10, '90d': 12 };
const chartData = data.slice(-SLICE[range]);
```

**Step 2: Same fix in FinlabExpenseCard**

Apply identical `SLICE` map and replace `.slice(-5)`.

**Step 3: Same fix in FinlabBalanceStatCard**

Replace `.slice(-12)` with range-aware slice (use same `SLICE` map or `{ '7d': 7, '30d': 12, '90d': 13 }`).

**Step 4: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add frontend/app/components/dashboard/FinlabIncomeCard.tsx \
  frontend/app/components/dashboard/FinlabExpenseCard.tsx \
  frontend/app/components/dashboard/FinlabBalanceStatCard.tsx
git commit -m "fix(statistics): use range-aware data slicing in chart cards"
```

---

## Task 6: Fix Income/Expense totals and % change calculations

**Files:**
- Modify: `frontend/app/components/dashboard/FinlabIncomeCard.tsx`
- Modify: `frontend/app/components/dashboard/FinlabExpenseCard.tsx`

**Context:**
The cards show `€0` and `0.0% VS This Month` even when data exists, because the sum/percentage logic may be faulty.

**Step 1: Read FinlabIncomeCard to verify current sum logic**

Open `frontend/app/components/dashboard/FinlabIncomeCard.tsx` fully to see how `totalIncome` and the % change badge are computed.

**Step 2: Fix total income calculation**

Ensure total sums ALL periods in the current range window (not just chart slice):
```tsx
const totalIncome = data.reduce((sum, pt) => sum + (pt.income ?? 0), 0);
```

**Step 3: Fix % change (VS period) calculation**

Split data into current-half and previous-half:
```tsx
const mid = Math.floor(data.length / 2);
const current = data.slice(mid).reduce((s, p) => s + p.income, 0);
const previous = data.slice(0, mid).reduce((s, p) => s + p.income, 0);
const pctChange = previous === 0 ? 0 : ((current - previous) / previous) * 100;
```

**Step 4: Same fix in FinlabExpenseCard** (replace `.income` with `.expense`)

**Step 5: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add frontend/app/components/dashboard/FinlabIncomeCard.tsx \
  frontend/app/components/dashboard/FinlabExpenseCard.tsx
git commit -m "fix(statistics): correct income/expense totals and period comparison"
```

---

## Task 7: Fix Last Transaction card — show real amounts and remove hardcoded "Success"

**Files:**
- Modify: `frontend/app/components/dashboard/FinlabTransactionCard.tsx`

**Context:**
Currently shows "-" for amount and hardcoded "Success" badge for all rows. The `DashboardRecentActivity` type has `amount: number | null` and `type` which can indicate success/fail.

**Step 1: Read FinlabTransactionCard fully**

Open the file to see current rendering of amount and status badge.

**Step 2: Render real amount**

Replace the hardcoded `-` with:
```tsx
{activity.amount != null
  ? `€${Math.abs(activity.amount).toLocaleString('en-EU', { minimumFractionDigits: 2 })}`
  : '—'}
```

**Step 3: Keep "Success" badge but derive from data**

Since `recentActivity` doesn't have a status field, keep the "Success" badge as-is for now (it reflects completed audit events). Add a comment:
```tsx
{/* Status is always "Success" for completed audit events */}
<span className="...">Success</span>
```

**Step 4: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add frontend/app/components/dashboard/FinlabTransactionCard.tsx
git commit -m "fix(statistics): show real amounts in Last Transaction card"
```

---

## Task 8: Wire calendar `targetDate` to visually update chart X-axis labels

**Files:**
- Modify: `frontend/app/page.tsx`

**Context:**
The calendar popover already lets user pick a date (the "anchor" date for the range). After Tasks 1–2, `targetDate` is wired to the hook. This task verifies the full flow: pick a date → charts refresh.

**Step 1: Add a visible indicator of selected date**

In `page.tsx`, near the calendar button, show the selected date so user knows it's working:
```tsx
{targetDate && (
  <span className="text-xs text-gray-400 ml-2">
    Anchor: {targetDate}
  </span>
)}
```

**Step 2: Verify API call includes `date` param**

Open browser DevTools → Network. Select a date in the calendar. Confirm the request is:
```
GET /api/v1/dashboard?range=30d&date=2026-02-15
```

**Step 3: Remove the debug indicator once verified**

Delete the "Anchor: {targetDate}" span added in Step 1.

**Step 4: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "fix(statistics): verify targetDate wired to dashboard API call"
```

---

## Task 9: Handle loading state in Statistics cards

**Files:**
- Modify: `frontend/app/page.tsx` (Statistics tab block)

**Context:**
When `isLoading` is true (hook is fetching), the cards receive stale or empty data. We should show a skeleton loader.

**Step 1: Check existing loading UI pattern**

Search for how `isLoading` is used in the Overview tab in `page.tsx` to reuse the same skeleton pattern.

**Step 2: Wrap Statistics tab content in loading guard**

```tsx
{activeTab === 'statistics' && (
  isLoading ? (
    <div className="grid grid-cols-12 gap-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="col-span-4 h-48 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  ) : (
    // existing 12-col grid with cards
  )
)}
```

**Step 3: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "feat(statistics): add loading skeleton for Statistics tab"
```

---

## Task 10: End-to-end smoke test

**Files:**
- Read: `frontend/app/page.tsx` (final state)
- Read: `frontend/app/hooks/useDashboard.ts` (final state)

**Step 1: Start local dev server**

```bash
make dev
# or: cd frontend && npm run dev
```

**Step 2: Open Statistics tab**

Navigate to `http://localhost:3000`, log in, go to Dashboard → Statistics tab.

**Step 3: Verify each card shows real data**

- Income Analysis: non-zero total + bar chart with bars
- Expense Analysis: non-zero total + area chart
- Balance Statistics: grouped bar chart
- Expense Category: donut chart with at least one category
- Last Transaction: rows with real amounts

**Step 4: Test range dropdown**

Click "Monthly ▼" on any card → select "Weekly" → verify all cards refresh and API call becomes `range=7d`.

**Step 5: Test calendar date filter**

Click the date pill (Mar 1, 2026) → pick a past date → verify API call includes `date=YYYY-MM-DD`.

**Step 6: Run linter**

```bash
make lint
```
Expected: 0 errors.

**Step 7: Final commit if any lint fixes**

```bash
git add -A && git commit -m "fix(statistics): lint cleanup after statistics wiring"
```
