# Overview Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the Overview tab into a focused Control Center with prominent action cards, reduced KPI noise, full-width charts, inline onboarding for empty states, and less-rounded (12px) card styling.

**Architecture:** Modify existing OverviewTab.tsx and its sub-components. Remove unused KPI cards (To Pay, Overdue). Promote Action Required to larger cards. Stack Cash Flow and Categories vertically instead of side-by-side. Add inline empty-state onboarding. Clean up TrendsTab by removing Income by Counterparty, Period stats, and Rows count.

**Tech Stack:** Next.js 14, React, Tailwind CSS v4, ECharts, Lucide icons

---

### Task 1: Reduce border-radius to 12px across all Overview cards

**Files:**
- Modify: `frontend/app/components/dashboard/common.ts:31`
- Modify: `frontend/app/components/dashboard/OverviewTab.tsx:101,142`
- Modify: `frontend/app/components/dashboard/ActionRequired.tsx:56`
- Modify: `frontend/app/components/dashboard/RecentActivity.tsx:92,116`
- Modify: `frontend/app/components/dashboard/TopCategoriesCard.tsx:59`

**Step 1: Update `common.ts` cardShell**

In `common.ts` line 31, change `rounded-xl` to `rounded-[12px]`.

**Step 2: Update OverviewTab.tsx**

- Line 101: change `rounded-[20px]` to `rounded-[12px]` (KPI cards)
- Line 142: change `rounded-[20px]` to `rounded-[12px]` (empty categories card)

**Step 3: Update ActionRequired.tsx**

- Line 56: change `rounded-[20px]` to `rounded-[12px]` (action cards)

**Step 4: Update RecentActivity.tsx**

- Line 92: change `rounded-[24px]` to `rounded-[12px]` (main card)
- Line 116: change `rounded-2xl` to `rounded-[12px]` (activity items)

**Step 5: Update TopCategoriesCard.tsx**

- Line 59: change `rounded-3xl` to `rounded-[12px]`

**Step 6: Verify visually**

Run: `cd frontend && npm run dev`
Check Overview tab -- all cards should have consistent 12px radius.

**Step 7: Commit**

```bash
git add frontend/app/components/dashboard/
git commit -m "style(dashboard): reduce card border-radius to 12px for professional aesthetic"
```

---

### Task 2: Remove "To Pay" and "Overdue" KPI cards from Financial Snapshot

**Files:**
- Modify: `frontend/app/components/dashboard/OverviewTab.tsx:34-93`

**Step 1: Remove unused icon imports**

Remove `Banknote` and `Clock` from the lucide-react import on line 5.

**Step 2: Remove snapshotCards entries**

Delete the `totalPayable` entry (lines 59-63) and `totalOverdue` entry (lines 64-70) from the `snapshotCards` array.

**Step 3: Update grid layout**

Line 93: change `lg:grid-cols-6` to `lg:grid-cols-4`.

**Step 4: Commit**

```bash
git add frontend/app/components/dashboard/OverviewTab.tsx
git commit -m "feat(dashboard): remove To Pay and Overdue KPIs from financial snapshot"
```

---

### Task 3: Make Action Required section larger and more prominent

**Files:**
- Modify: `frontend/app/components/dashboard/ActionRequired.tsx:46-98`
- Modify: `frontend/app/components/dashboard/OverviewTab.tsx:20-30`

**Step 1: Update ActionRequired grid and card sizing**

In `ActionRequired.tsx`:
- Line 46: change grid from `lg:grid-cols-3` to `lg:grid-cols-2`
- Line 56: increase card padding from `px-4 py-3` to `px-5 py-5`
- Line 60: increase icon from `h-10 w-10` to `h-12 w-12`
- Line 71: increase count font from `text-[18px]` to `text-[22px]`
- Line 81: increase label font from `text-[13px]` to `text-[14px]`

**Step 2: Add synthetic "Parsing issues" action from dataHealth**

In `OverviewTab.tsx`, after the `mappedActions` mapping (line 30), add:

```typescript
if (data.dataHealth?.parsingWarnings > 0) {
  mappedActions.push({
    type: 'parsing_warnings',
    count: data.dataHealth.parsingWarnings,
    label: 'Parsing issues found',
    href: '/statements?filter=has_errors',
    priority: 'warning' as const,
  });
}
```

Also add `TriangleAlert` to the `iconMap` in `ActionRequired.tsx`:
```typescript
parsing_warnings: TriangleAlert,
```

And import `TriangleAlert` from lucide-react.

**Step 3: Commit**

```bash
git add frontend/app/components/dashboard/ActionRequired.tsx frontend/app/components/dashboard/OverviewTab.tsx
git commit -m "feat(dashboard): make Action Required cards larger and add parsing issues action"
```

---

### Task 4: Make Cash Flow chart full-width and stack Categories below

**Files:**
- Modify: `frontend/app/components/dashboard/OverviewTab.tsx:129-150`

**Step 1: Replace grid layout with vertical stack**

Replace the section at lines 129-150 with:

```tsx
{/* 3. Cash Flow -- full width */}
<section>
  <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
    Cash Flow
  </h2>
  <div className="h-[400px]">
    <CashFlowMini
      data={data.cashFlow}
      title={`Cash Flow (${rangeLabel})`}
      emptyLabel="No cash flow data available. Upload a bank statement to get started."
    />
  </div>
</section>

{/* 4. Spending Categories */}
<section>
  <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
    Spending Categories
  </h2>
  <div className="h-[320px]">
    {data.topCategories && data.topCategories.length > 0 ? (
      <TopCategoriesCard categories={data.topCategories} />
    ) : (
      <Card className="h-full border border-slate-100 bg-white shadow-sm rounded-[12px] flex items-center justify-center">
        <div className="text-center text-sm text-slate-400">
          <p className="font-medium">No spending categories yet</p>
          <p className="text-xs mt-1">Categorize transactions to see top spending areas</p>
        </div>
      </Card>
    )}
  </div>
</section>
```

**Step 2: Commit**

```bash
git add frontend/app/components/dashboard/OverviewTab.tsx
git commit -m "feat(dashboard): make cash flow full-width and stack categories below"
```

---

### Task 5: Add inline onboarding empty state

**Files:**
- Modify: `frontend/app/components/dashboard/OverviewTab.tsx`

**Step 1: Add empty-state detection in OverviewTab**

At the beginning of the `OverviewTab` component function body, add:

```typescript
const hasNoData =
  data.cashFlow.length === 0 &&
  (data.actions || []).length === 0 &&
  data.recentActivity.length === 0 &&
  data.snapshot.totalBalance === 0;
```

**Step 2: Add onboarding UI early return**

Before the main return JSX, add:

```tsx
if (hasNoData) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-[12px] bg-sky-50 mb-6">
        <FileUp className="h-10 w-10 text-sky-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Upload your first statement
      </h2>
      <p className="text-sm text-slate-500 max-w-md mb-8">
        Start tracking your finances by uploading a bank statement.
        We'll parse it automatically and show your cash flow, categories, and insights.
      </p>
      <Link
        href="/statements/submit"
        className="inline-flex items-center gap-2 rounded-[12px] bg-[#0a66c2] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#004182]"
      >
        <FileUp className="h-4 w-4" />
        Parse statement
      </Link>
    </div>
  );
}
```

Add required imports: `FileUp` from lucide-react, `Link` from next/link.

**Step 3: Commit**

```bash
git add frontend/app/components/dashboard/OverviewTab.tsx
git commit -m "feat(dashboard): add inline onboarding empty state for Overview"
```

---

### Task 6: Remove Income by Counterparty, Period stats, and Rows count from TrendsTab

**Files:**
- Modify: `frontend/app/components/dashboard/TrendsTab.tsx`

**Step 1: Remove `horizontalBarOption` useMemo**

Delete the entire useMemo block for `horizontalBarOption` (lines 79-96).

**Step 2: Remove Rows line from Statements card**

Delete the "Rows" div (lines 166-171) inside the Statements card.

**Step 3: Remove Period card**

Delete the entire Period card div (lines 215-238).

**Step 4: Remove Income by Counterparty render section**

Delete the entire `<section>` containing "Income by Counterparty" (lines 281-300).

**Step 5: Update Data Sources grid**

Change `sm:grid-cols-3` to `sm:grid-cols-2` on line 147.

**Step 6: Commit**

```bash
git add frontend/app/components/dashboard/TrendsTab.tsx
git commit -m "refactor(dashboard): remove counterparty chart, period stats, rows count from Trends"
```

---

### Task 7: Update tests and verify build

**Files:**
- Modify: `frontend/app/components/dashboard/__tests__/ActionRequired.test.tsx`
- Modify: `frontend/app/components/dashboard/__tests__/FinancialSnapshot.test.tsx`

**Step 1: Review and fix ActionRequired tests**

Check for assertions referencing old grid/card sizes. Update if needed.

**Step 2: Review and fix FinancialSnapshot tests**

Remove assertions for "To Pay" and "Overdue" KPI cards if present.

**Step 3: Run tests**

```bash
cd frontend && npx jest --passWithNoTests
```

Expected: All tests pass.

**Step 4: Run lint**

```bash
cd frontend && npx biome check src/
```

Expected: No errors.

**Step 5: Commit**

```bash
git add frontend/app/components/dashboard/__tests__/
git commit -m "test(dashboard): update tests for overview redesign"
```
