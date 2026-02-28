# Dashboard Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fully redesign the Dashboard (`frontend/app/page.tsx`) into the new layout: SummaryCards -> ActionRequired -> CashFlowChart -> TopMerchants + TopCategories -> RecentActivity, with a 7d/30d/90d range switcher and rich empty state.

**Architecture:** Extend `GET /dashboard` with `?range=7d|30d|90d` and include `topMerchants` and `topCategories` in the response. Rewrite the frontend dashboard page to use only `useDashboard` for all data and remove standalone calls to `/reports/top-categories`, `/statements`, `/gmail/receipts`. Build RecentActivity from `AuditEvent`.

**Tech Stack:** NestJS + TypeORM (backend), Next.js 14 App Router + Tailwind + echarts-for-react + Lucide (frontend), Jest + Testing Library (tests)

---

## Current State

### Backend
- `backend/src/modules/dashboard/dashboard.controller.ts` -> `GET /dashboard`, no query params, always 30d
- `backend/src/modules/dashboard/dashboard.service.ts` -> getSnapshot/getActions/getCashFlow/getRecentActivity/getMemberRole
- `backend/src/modules/dashboard/interfaces/dashboard-response.interface.ts` -> response types
- No `topMerchants`, no `topCategories` in dashboard response
- RecentActivity uses statements + transactions only

### Frontend
- `frontend/app/page.tsx` -> renders TopCategoriesChart + 3-column layout (statements/receipts/notifications)
- `frontend/app/components/dashboard/FinancialSnapshot.tsx` -> exists, not used
- `frontend/app/components/dashboard/CashFlowChart.tsx` -> exists, not used
- `frontend/app/components/dashboard/ActionRequired.tsx` -> exists, not used
- `frontend/app/components/dashboard/RecentActivity.tsx` -> exists, not used
- `frontend/app/hooks/useDashboard.ts` -> no range param, no topMerchants

---

## Task 1: Backend - add range + topMerchants/topCategories + AuditEvent activity

**Files:**
- Modify: `backend/src/modules/dashboard/interfaces/dashboard-response.interface.ts`
- Modify: `backend/src/modules/dashboard/dashboard.controller.ts`
- Modify: `backend/src/modules/dashboard/dashboard.service.ts`
- Modify: `backend/src/modules/dashboard/dashboard.module.ts`
- Test: `backend/@tests/unit/dashboard.service.spec.ts`

### Step 1: Add interfaces in dashboard-response.interface.ts

```typescript
export interface DashboardTopMerchant {
  name: string;
  amount: number;
  count: number;
}

export interface DashboardTopCategory {
  id: string | null;
  name: string;
  amount: number;
  count: number;
}

export interface DashboardResponse {
  snapshot: DashboardFinancialSnapshot;
  actions: DashboardActionItem[];
  cashFlow: DashboardCashFlowPoint[];
  topMerchants: DashboardTopMerchant[];
  topCategories: DashboardTopCategory[];
  recentActivity: DashboardRecentActivity[];
  role: 'owner' | 'admin' | 'member' | 'viewer';
  range: '7d' | '30d' | '90d';
}
```

### Step 2: Add @Query('range') in controller

```typescript
@Get()
async getDashboard(
  @CurrentUser() user: User,
  @Query('range') range: '7d' | '30d' | '90d' = '30d',
) {
  return this.dashboardService.getDashboard(user.id, user.workspaceId, range);
}
```

### Step 3: Implement getTopMerchants

```typescript
private async getTopMerchants(
  workspaceId: string,
  since: Date,
): Promise<DashboardTopMerchant[]> {
  const result = await this.transactionRepo
    .createQueryBuilder('t')
    .innerJoin('t.statement', 's')
    .select('t.counterpartyName', 'name')
    .addSelect('COALESCE(SUM(t.debit), 0)', 'amount')
    .addSelect('COUNT(t.id)', 'count')
    .where('s.workspaceId = :workspaceId', { workspaceId })
    .andWhere('t.transactionDate >= :since', { since })
    .andWhere('s.deletedAt IS NULL')
    .andWhere('t.transactionType = :expense', { expense: TransactionType.EXPENSE })
    .andWhere('t.counterpartyName IS NOT NULL')
    .andWhere("t.counterpartyName != ''")
    .groupBy('t.counterpartyName')
    .orderBy('amount', 'DESC')
    .limit(5)
    .getRawMany<{ name: string; amount: string; count: string }>();

  return result.map(row => ({
    name: row.name,
    amount: Number.parseFloat(row.amount) || 0,
    count: Number.parseInt(row.count, 10) || 0,
  }));
}
```

### Step 4: Implement getTopCategories

```typescript
private async getTopCategories(
  workspaceId: string,
  since: Date,
): Promise<DashboardTopCategory[]> {
  const result = await this.transactionRepo
    .createQueryBuilder('t')
    .innerJoin('t.statement', 's')
    .leftJoin('t.category', 'c')
    .select('c.id', 'id')
    .addSelect("COALESCE(c.name, 'Uncategorized')", 'name')
    .addSelect('COALESCE(SUM(t.debit), 0)', 'amount')
    .addSelect('COUNT(t.id)', 'count')
    .where('s.workspaceId = :workspaceId', { workspaceId })
    .andWhere('t.transactionDate >= :since', { since })
    .andWhere('s.deletedAt IS NULL')
    .andWhere('t.transactionType = :expense', { expense: TransactionType.EXPENSE })
    .groupBy('c.id')
    .addGroupBy('c.name')
    .orderBy('amount', 'DESC')
    .limit(5)
    .getRawMany<{ id: string | null; name: string; amount: string; count: string }>();

  return result.map(row => ({
    id: row.id || null,
    name: row.name,
    amount: Number.parseFloat(row.amount) || 0,
    count: Number.parseInt(row.count, 10) || 0,
  }));
}
```

### Step 5: Update getRecentActivity to use AuditEvent

```typescript
private async getRecentActivity(workspaceId: string): Promise<DashboardRecentActivity[]> {
  const auditEvents = await this.auditRepo.find({
    where: {
      workspaceId,
      entityType: In([
        EntityType.STATEMENT,
        EntityType.TRANSACTION,
        EntityType.PAYABLE,
        EntityType.CATEGORY,
      ]),
    },
    order: { createdAt: 'DESC' },
    take: 10,
  });

  return auditEvents.map(event => {
    let type: DashboardRecentActivity['type'] = 'transaction';
    let href = '/statements';

    if (event.entityType === EntityType.STATEMENT) {
      type = 'statement_upload';
      href = `/statements/${event.entityId}/view`;
    } else if (event.entityType === EntityType.PAYABLE) {
      type = 'payment';
      href = '/statements/pay';
    } else if (event.entityType === EntityType.CATEGORY) {
      type = 'categorization';
      href = '/statements';
    }

    const meta = event.meta as Record<string, any> | null;

    return {
      id: event.id,
      type,
      title: meta?.fileName || meta?.counterpartyName || meta?.name || event.entityId,
      description: `${event.action} · ${event.actorLabel}`,
      amount: meta?.amount ?? null,
      timestamp: event.createdAt.toISOString(),
      href,
    };
  });
}
```

### Step 6: Update getDashboard + getCashFlow

- Parse range into days (7/30/90)
- For 90d, group cash flow by week (`TO_CHAR(t.transactionDate, 'IYYY-IW')`)

### Step 7: Add AuditEvent repository

```typescript
TypeOrmModule.forFeature([
  Transaction, Statement, Payable, Wallet, Receipt, WorkspaceMember, Workspace, AuditEvent
])
```

### Step 8: Write unit tests

- `getDashboard` includes `topMerchants` and `topCategories`
- range=7d uses 7-day window
- range=90d groups cashFlow by week

### Step 9: Run backend tests

```bash
cd backend && npm run test -- --testPathPattern=dashboard
```

### Step 10: Commit

```bash
git commit -m "feat(dashboard): add range param, topMerchants, topCategories, AuditEvent activity"
```

---

## Task 2: Frontend - update useDashboard hook

**Files:**
- Modify: `frontend/app/hooks/useDashboard.ts`

### Step 1: Add types

```typescript
export interface DashboardTopMerchant {
  name: string;
  amount: number;
  count: number;
}

export type DashboardRange = '7d' | '30d' | '90d';
```

### Step 2: Add range state + changeRange

```typescript
export function useDashboard(initialRange: DashboardRange = '30d') {
  const [range, setRange] = useState<DashboardRange>(initialRange);

  const load = useCallback(async (r: DashboardRange = range) => {
    const response = await apiClient.get('/dashboard', { params: { range: r } });
    setData(response.data?.data || response.data);
  }, [range]);

  const changeRange = useCallback((newRange: DashboardRange) => {
    setRange(newRange);
    void load(newRange);
  }, [load]);

  return { data, loading, error, refresh: load, range, changeRange };
}
```

### Step 3: Commit

```bash
git commit -m "feat(dashboard): add range param to useDashboard hook"
```

---

## Task 3: Frontend - create TopMerchantsCard

**Files:**
- Create: `frontend/app/components/dashboard/TopMerchantsCard.tsx`
- Test: `frontend/app/components/dashboard/__tests__/TopMerchantsCard.test.tsx`

### Step 1: Write test

```typescript
render(<TopMerchantsCard merchants={mockMerchants} ... />)
expect(screen.getByText('Kaspi Bank')).toBeInTheDocument();
```

### Step 2: Run test (fail)

```bash
cd frontend && npx jest TopMerchantsCard --no-coverage
```

### Step 3: Implement component

- Render list of merchants
- Progress bar width = amount / maxAmount
- Link to `/statements?counterparty=${name}`

### Step 4: Run test (pass)

### Step 5: Commit

```bash
git commit -m "feat(dashboard): add TopMerchantsCard component"
```

---

## Task 4: Frontend - create TopCategoriesCard

**Files:**
- Create: `frontend/app/components/dashboard/TopCategoriesCard.tsx`

### Step 1: Implement component

- Render list with progress bars
- Link to `/statements?categoryId=${id}` or `/statements?missingCategory=true`

### Step 2: Commit

```bash
git commit -m "feat(dashboard): add TopCategoriesCard component"
```

---

## Task 5: Frontend - create RangeSwitcher

**Files:**
- Create: `frontend/app/components/dashboard/RangeSwitcher.tsx`

### Step 1: Implement component

- 3 buttons in pill group
- Active = white bg + shadow

### Step 2: Commit

```bash
git commit -m "feat(dashboard): add RangeSwitcher component"
```

---

## Task 6: Frontend - create EmptyState

**Files:**
- Create: `frontend/app/components/dashboard/EmptyState.tsx`

### Step 1: Implement component

- Big CTA: Upload statement
- Secondary: Connect Gmail, Manual entry
- 3-step guide

### Step 2: Commit

```bash
git commit -m "feat(dashboard): add rich EmptyState component"
```

---

## Task 7: Frontend - rewrite dashboard page

**Files:**
- Modify: `frontend/app/page.tsx`

### Step 1: Remove old requests

- Remove topCategories, latestStatements, latestReceipts state + useEffect
- Remove notifications block

### Step 2: Use new layout

Order:
1. FinancialSnapshot
2. ActionRequired
3. CashFlowChart (full width card)
4. TopMerchantsCard + TopCategoriesCard (2 columns)
5. RecentActivity

### Step 3: Add RangeSwitcher in header

### Step 4: Replace empty state with EmptyState component

### Step 5: Update skeleton loading to new layout

### Step 6: Commit

```bash
git commit -m "feat(dashboard): full redesign with new layout and range switcher"
```

---

## Task 8: Frontend - update i18n keys

**Files:**
- Modify dashboard content files (find with `find frontend -name "*dashboard*"`)

Add keys:
- `range.7d`, `range.30d`, `range.90d`
- `topMerchants.title`, `topMerchants.empty`
- `topCategories.title`, `topCategories.empty`
- `cashFlow.title`, `cashFlow.empty`
- `actions.title`, `actions.empty`
- `emptyState.step1`, `emptyState.step2`, `emptyState.step3`

### Commit

```bash
git commit -m "feat(dashboard): add i18n keys for new dashboard components"
```

---

## Task 9: Frontend - update tests

**Files:**
- Modify: `frontend/app/components/dashboard/__tests__/FinancialSnapshot.test.tsx`
- Modify: `frontend/app/components/dashboard/__tests__/ActionRequired.test.tsx`

### Step 1: Run tests

```bash
cd frontend && npx jest dashboard --no-coverage
```

### Step 2: Fix failing tests

- Update mock data

### Step 3: Run all frontend tests

```bash
cd frontend && npm run test -- --no-coverage
```

### Step 4: Commit

```bash
git commit -m "test(dashboard): update component tests after redesign"
```

---

## Task 10: Final verification

1. `make lint`
2. `make format`
3. `make test-backend`
4. `make test-frontend`
5. `make dev` and manual QA

---

## Navigation mappings

| Block | Click | URL |
|------|------|-----|
| Expense card | -> spend over time | `/statements/spend-over-time?type=expense&range=${range}` |
| Income card | -> spend over time | `/statements/spend-over-time?type=income&range=${range}` |
| TopMerchant row | -> statements | `/statements?counterparty=${name}` |
| TopCategory row | -> statements | `/statements?categoryId=${id}` |
| TopCategory (uncategorized) | -> statements | `/statements?missingCategory=true` |
| Action: overdue | -> pay | `/statements/pay?status=overdue` |
| Action: uncategorized | -> statements | `/statements?missingCategory=true` |
| Action: pending review | -> approve | `/statements/approve` |
| CashFlow point click | -> statements | `/statements?dateFrom=${date}&dateTo=${date}` |

---

## Stage mapping (aligned with docs/plans/dashboard-plan.md)

| Stage | Focus | Tasks |
|------|-------|-------|
| Stage 1 (MVP) | summary cards, action required, chart, backend | Task 1, 2, 7 |
| Stage 2 | top merchants/categories, rich activity, empty state | Task 3, 4, 5, 6, 8 |
| Stage 3 | tests and QA | Task 9, 10 |
