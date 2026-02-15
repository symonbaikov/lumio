# Spend Over Time Report Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a backend spend-over-time analytics endpoint with filters, grouping, and empty-period fill.

**Architecture:** Add a query DTO mirroring TopCategoriesQueryDto validation/transform patterns, a reports service method that aggregates transactions by period with filters and date defaults, and a controller endpoint guarded by report permission. Include a period-fill step for continuous time series.

**Tech Stack:** NestJS, TypeORM, class-validator/class-transformer, TypeScript.

---

### Task 1: Add spend-over-time query DTO

**Files:**
- Create: `backend/src/modules/reports/dto/spend-over-time-query.dto.ts`
- Reference: `backend/src/modules/reports/dto/top-categories-query.dto.ts`

**Step 1: Write the failing test**

```ts
// (Deferred) No tests required for this task by instruction.
```

**Step 2: Run test to verify it fails**

Run: `make test-backend`
Expected: (Skipped)

**Step 3: Write minimal implementation**

```ts
// Create SpendOverTimeQueryDto mirroring TopCategoriesQueryDto
// Fields: dateFrom, dateTo, type, groupBy, statuses, keywords, amountMin,
// amountMax, currencies, approved, billable, exported, paid, bankName,
// counterparties
// Use same validation/transform patterns as TopCategoriesQueryDto
```

**Step 4: Run test to verify it passes**

Run: `make test-backend`
Expected: PASS (Skipped)

**Step 5: Commit**

```bash
git add backend/src/modules/reports/dto/spend-over-time-query.dto.ts
git commit -m "feat(reports): add spend-over-time query dto"
```

### Task 2: Add spend-over-time report service method

**Files:**
- Modify: `backend/src/modules/reports/reports.service.ts`
- Reference: `backend/src/modules/reports/reports.service.ts` (getTopCategoriesReport)
- (Optional) Create: `backend/src/modules/reports/interfaces/spend-over-time-report.interface.ts`

**Step 1: Write the failing test**

```ts
// (Deferred) No tests required for this task by instruction.
```

**Step 2: Run test to verify it fails**

Run: `make test-backend`
Expected: (Skipped)

**Step 3: Write minimal implementation**

```ts
// Add getSpendOverTimeReport(userId, query)
// - Base query: Transaction joined with Statement + Category
// - Apply filters: status, keywords, amounts, currencies, approved, billable,
//   exported, paid, bankName, counterparties, type
// - Date range default last 30 days if missing
// - Group by day/week/month using transactionDate
// - Calculate income/expense/net/count per period
// - Fill empty periods between dateFrom/dateTo with zeros
// - Return { groupBy, dateFrom, dateTo, points, totals }
// - Week period key format: YYYY-Www, label: Week ww
```

**Step 4: Run test to verify it passes**

Run: `make test-backend`
Expected: PASS (Skipped)

**Step 5: Commit**

```bash
git add backend/src/modules/reports/reports.service.ts backend/src/modules/reports/interfaces/spend-over-time-report.interface.ts
git commit -m "feat(reports): add spend-over-time service method"
```

### Task 3: Add spend-over-time controller endpoint

**Files:**
- Modify: `backend/src/modules/reports/reports.controller.ts`

**Step 1: Write the failing test**

```ts
// (Deferred) No tests required for this task by instruction.
```

**Step 2: Run test to verify it fails**

Run: `make test-backend`
Expected: (Skipped)

**Step 3: Write minimal implementation**

```ts
// Add GET /reports/spend-over-time
// - @RequirePermission(Permission.REPORT_VIEW)
// - @UseGuards(PermissionsGuard)
// - Calls reportsService.getSpendOverTimeReport(userId, query)
```

**Step 4: Run test to verify it passes**

Run: `make test-backend`
Expected: PASS (Skipped)

**Step 5: Commit**

```bash
git add backend/src/modules/reports/reports.controller.ts
git commit -m "feat(reports): add spend-over-time endpoint"
```
