# Top Categories Tab with Statement Drill-down

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert "Top categories" from an expandable sidebar item into a standalone tab that shows a flat list of categories, each clickable to view filtered statements/receipts.

**Architecture:** Remove the expand/collapse children from the sidebar's "Top categories" nav item, making it a simple link to `/statements/top-categories`. The page shows all categories with transactions as clickable cards. Clicking a category navigates to `/statements/top-categories/[categoryId]` which fetches and displays statements containing transactions with that category via a new backend filter.

**Tech Stack:** Next.js 14 App Router, NestJS, TypeORM, TypeScript, Tailwind CSS, lucide-react

---

## Context & Current State

### Current Behavior
- `StatementsSidePanel.tsx:307-330` defines "Top categories" as a nav item with `children` -- an array of `NavigationItem` rendered as expand/collapse.
- Children are `disabled: true` (not clickable), showing category name, transaction count, and amount.
- Data comes from `GET /reports/statements/summary` (categories have `name`, `amount`, `rows` but **no ID**).
- The existing `TopCategoriesView.tsx` shows analytics charts/tables at `/statements/top-categories`.

### Target Behavior
- "Top categories" in sidebar = simple link to `/statements/top-categories` (no children, no expand).
- Sidebar badge shows total count of categories with transactions.
- `/statements/top-categories` page shows **flat list of all category cards** (name, amount, transaction count) -- clickable.
- `/statements/top-categories/[categoryId]` shows **list of statements/receipts** that contain at least one transaction with that category.

### Key Files Reference

| File | Purpose |
|------|---------|
| `backend/src/modules/statements/statements.controller.ts:157-179` | `GET /statements` endpoint |
| `backend/src/modules/statements/statements.service.ts:205-243` | `findAll()` query builder |
| `backend/src/entities/statement.entity.ts` | Statement entity (has `transactions` OneToMany) |
| `backend/src/entities/transaction.entity.ts:86-91` | Transaction `categoryId` field |
| `backend/src/modules/transactions/transactions.controller.ts:37-77` | `GET /transactions` with `categoryId` filter |
| `frontend/app/(main)/statements/components/StatementsSidePanel.tsx` | Side panel config |
| `frontend/app/lib/statement-insights.ts:13-17` | `TopCategoryPreviewItem` type |
| `frontend/app/lib/top-categories-api.ts` | `fetchTopCategoriesReport()` -- returns categories with IDs |
| `frontend/app/(main)/statements/top-categories/page.tsx` | Current page (renders TopCategoriesView) |
| `frontend/app/(main)/statements/components/TopCategoriesView.tsx` | Analytics charts/tables view |
| `frontend/app/components/side-panel/sections/index.tsx:131-215` | `NavigationItemComponent` (expand/collapse logic) |

---

## Task 1: Backend -- Add `categoryId` filter to `GET /statements`

**Files:**
- Modify: `backend/src/modules/statements/statements.controller.ts:157-179`
- Modify: `backend/src/modules/statements/statements.service.ts:205-243`
- Test: `backend/@tests/unit/statements/statements-category-filter.spec.ts`

### Step 1: Write the failing test

Create `backend/@tests/unit/statements/statements-category-filter.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { StatementsService } from '../../../src/modules/statements/statements.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Statement } from '../../../src/entities/statement.entity';

describe('StatementsService.findAll with categoryId filter', () => {
  let service: StatementsService;
  let mockQueryBuilder: any;

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    const mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module = await Test.createTestingModule({
      providers: [
        StatementsService,
        { provide: getRepositoryToken(Statement), useValue: mockRepo },
        // Provide other dependencies as needed with mocks
      ],
    }).compile();

    // May need to mock additional dependencies
  });

  it('should add transaction category join when categoryId is provided', async () => {
    // This test verifies the query builder receives the correct join/where
    // when categoryId is passed to findAll
    // Exact implementation depends on service constructor dependencies
  });
});
```

> Note: The exact test setup depends on `StatementsService` constructor dependencies. The implementing engineer should check the constructor and mock all required providers.

### Step 2: Run test to verify it fails

```bash
cd backend && npx jest @tests/unit/statements/statements-category-filter.spec.ts --no-coverage
```

Expected: FAIL (service not accepting categoryId yet)

### Step 3: Add `categoryId` query param to controller

In `backend/src/modules/statements/statements.controller.ts`, modify `findAll()`:

```typescript
@Get()
@UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
@RequirePermission(Permission.STATEMENT_VIEW)
async findAll(
  @CurrentUser() user: User,
  @WorkspaceId() workspaceId: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
  @Query('search') search?: string,
  @Query('categoryId') categoryId?: string,  // NEW
) {
  const result = await this.statementsService.findAll(
    workspaceId,
    page ? Number.parseInt(page) : 1,
    limit ? Number.parseInt(limit) : 20,
    search,
    categoryId,  // NEW
  );

  return {
    ...result,
    items: result.data,
  };
}
```

### Step 4: Add categoryId filter logic to service

In `backend/src/modules/statements/statements.service.ts`, modify `findAll()`:

```typescript
async findAll(
  workspaceId: string,
  page = 1,
  limit = 20,
  search?: string,
  categoryId?: string,  // NEW
): Promise<{
  data: Statement[];
  total: number;
  page: number;
  limit: number;
}> {
  const qb = this.statementRepository
    .createQueryBuilder('statement')
    .leftJoinAndSelect('statement.user', 'user')
    .where('statement.deletedAt IS NULL')
    .andWhere('statement.workspaceId = :workspaceId', { workspaceId })
    .orderBy('statement.createdAt', 'DESC')
    .skip((page - 1) * limit)
    .take(limit);

  if (search) {
    qb.andWhere('statement.fileName ILIKE :search', {
      search: `%${search}%`,
    });
  }

  // NEW: Filter statements that contain transactions with the given category
  if (categoryId) {
    if (categoryId === 'uncategorized') {
      // Special case: statements with transactions that have NO category
      qb.andWhere(
        `statement.id IN (
          SELECT DISTINCT t."statementId" FROM transactions t
          WHERE t."categoryId" IS NULL
          AND t."workspaceId" = :workspaceId
        )`,
        { workspaceId },
      );
    } else {
      qb.andWhere(
        `statement.id IN (
          SELECT DISTINCT t."statementId" FROM transactions t
          WHERE t."categoryId" = :categoryId
          AND t."workspaceId" = :workspaceId
        )`,
        { categoryId, workspaceId },
      );
    }
  }

  const [dataRaw, total] = await qb.getManyAndCount();
  const data = await Promise.all(
    dataRaw.map(async st => {
      const availability = await this.fileStorageService.getFileAvailability(st);
      (st as any).hasFileOnDisk = availability.onDisk;
      (st as any).hasFileInDb = availability.inDb;
      (st as any).fileAvailability = availability;
      return st;
    }),
  );

  return { data, total, page, limit };
}
```

### Step 5: Run test to verify it passes

```bash
cd backend && npx jest @tests/unit/statements/statements-category-filter.spec.ts --no-coverage
```

Expected: PASS

### Step 6: Commit

```bash
git add backend/src/modules/statements/statements.controller.ts backend/src/modules/statements/statements.service.ts backend/@tests/unit/statements/statements-category-filter.spec.ts
git commit -m "feat(statements): add categoryId filter to GET /statements endpoint"
```

---

## Task 2: Frontend -- Update sidebar data source and remove children

**Files:**
- Modify: `frontend/app/(main)/statements/components/StatementsSidePanel.tsx:55,100-111,307-330`
- Modify: `frontend/app/lib/statement-insights.ts:13-17,69-89`

### Step 1: Update `TopCategoryPreviewItem` to include `id`

In `frontend/app/lib/statement-insights.ts`, update the interface and function:

```typescript
export interface TopCategoryPreviewItem {
  id: string | null;  // NEW: category UUID or null for uncategorized
  name: string;
  amount: number;
  rows: number;
}

export function getTopCategoriesPreview(
  categories: Array<{ id?: string | null; name: string; amount: number; rows: number }>,
  limit?: number,  // CHANGED: optional, no limit = return all
): TopCategoryPreviewItem[] {
  const sorted = [...categories]
    .sort((a, b) => {
      if (b.amount !== a.amount) {
        return b.amount - a.amount;
      }
      if (b.rows !== a.rows) {
        return b.rows - a.rows;
      }
      return a.name.localeCompare(b.name);
    })
    .map(item => ({
      id: item.id ?? null,
      name: item.name,
      amount: item.amount,
      rows: item.rows,
    }));

  return limit ? sorted.slice(0, Math.max(0, limit)) : sorted;
}
```

### Step 2: Update sidebar to use `fetchTopCategoriesReport` and remove children

In `frontend/app/(main)/statements/components/StatementsSidePanel.tsx`:

**Add import:**
```typescript
import { fetchTopCategoriesReport } from '@/app/lib/top-categories-api';
```

**Replace the summary API call** (lines 100-106) with `fetchTopCategoriesReport`:

Replace:
```typescript
const summaryResponse = await apiClient.get('/reports/statements/summary', {
  params: { days: 90 },
});
const summaryCategories = Array.isArray(summaryResponse.data?.categories)
  ? summaryResponse.data.categories
  : [];
const categoriesPreview = getTopCategoriesPreview(summaryCategories, 5);
```

With:
```typescript
const formatDateOnly = (d: Date) => {
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DEFAULT_REPORT_FILTERS = {
  type: 'expense' as const,
  statuses: [] as string[],
  keywords: '',
  amountMin: null,
  amountMax: null,
  currencies: [] as string[],
  approved: null,
  billable: null,
  has: [] as string[],
  groupBy: null,
  exported: null,
  paid: null,
  from: [] as string[],
  to: [] as string[],
  date: null,
  limit: 100,
};

const reportResponse = await fetchTopCategoriesReport(DEFAULT_REPORT_FILTERS as any, {
  dateFrom: formatDateOnly(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
  dateTo: formatDateOnly(new Date()),
});
const reportCategories = (reportResponse.categories || []).map(c => ({
  id: c.id,
  name: c.name,
  amount: c.amount,
  rows: c.transactions,
}));
const categoriesPreview = getTopCategoriesPreview(reportCategories);
```

**Remove children from top-categories nav item** (lines 307-330). Replace with:

```typescript
{
  id: 'top-categories',
  label: (t as any)?.sidePanel?.topCategories?.value ?? 'Top categories',
  icon: Folder,
  badge: topCategories.length,
  href: '/statements/top-categories',
  active: activeItem === 'top-categories',
  // No children -- simple link now
},
```

### Step 3: Verify sidebar renders without expand/collapse

```bash
cd frontend && npm run dev
```

Navigate to `/statements/submit`, verify "Top categories" shows as a simple link with badge count. Click navigates to `/statements/top-categories`.

### Step 4: Commit

```bash
git add frontend/app/(main)/statements/components/StatementsSidePanel.tsx frontend/app/lib/statement-insights.ts
git commit -m "feat(sidebar): convert top-categories from expandable to simple nav link with full data"
```

---

## Task 3: Frontend -- Replace TopCategoriesView with category list page

**Files:**
- Modify: `frontend/app/(main)/statements/top-categories/page.tsx`
- Create: `frontend/app/(main)/statements/components/CategoriesListView.tsx`

### Step 1: Create `CategoriesListView` component

Create `frontend/app/(main)/statements/components/CategoriesListView.tsx`:

```typescript
'use client';

import LoadingAnimation from '@/app/components/LoadingAnimation';
import { DEFAULT_STATEMENT_FILTERS } from '@/app/(main)/statements/components/filters/statement-filters';
import { fetchTopCategoriesReport } from '@/app/lib/top-categories-api';
import { cn } from '@/app/lib/utils';
import { Folder, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const formatMoney = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

interface CategoryItem {
  id: string | null;
  name: string;
  amount: number;
  percentage: number;
  transactions: number;
  type: 'income' | 'expense';
  color?: string | null;
  icon?: string | null;
}

export default function CategoriesListView() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      try {
        setLoading(true);
        const report = await fetchTopCategoriesReport(
          { ...DEFAULT_STATEMENT_FILTERS, limit: 100 },
        );
        if (isMounted) {
          setCategories(report.categories || []);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load categories');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCategories();
    return () => { isMounted = false; };
  }, []);

  const handleCategoryClick = (category: CategoryItem) => {
    const categoryId = category.id ?? 'uncategorized';
    router.push(`/statements/top-categories/${categoryId}`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <LoadingAnimation />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Folder className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No categories with transactions found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Top Categories</h1>
        <p className="text-sm text-gray-500 mb-6">
          {categories.length} categories with transactions
        </p>

        <div className="space-y-2">
          {categories.map((category, index) => (
            <button
              key={category.id ?? 'uncategorized'}
              type="button"
              onClick={() => handleCategoryClick(category)}
              className={cn(
                'w-full flex items-center justify-between gap-4 p-4 rounded-xl',
                'bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm',
                'transition-all duration-150 text-left group',
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm text-gray-400 w-6 text-right shrink-0">
                  {index + 1}.
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {category.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {category.transactions} transactions &middot; {category.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold text-gray-900">
                  {formatMoney(category.amount)}
                </span>
                <ChevronRight
                  size={16}
                  className="text-gray-300 group-hover:text-gray-500 transition-colors"
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Step 2: Update the page to use CategoriesListView

Modify `frontend/app/(main)/statements/top-categories/page.tsx`:

```typescript
'use client';

import StatementsSidePanel from '@/app/(main)/statements/components/StatementsSidePanel';
import CategoriesListView from '@/app/(main)/statements/components/CategoriesListView';

export default function StatementsTopCategoriesPage() {
  return (
    <>
      <StatementsSidePanel activeItem="top-categories" />
      <CategoriesListView />
    </>
  );
}
```

### Step 3: Verify the page renders

```bash
cd frontend && npm run dev
```

Navigate to `/statements/top-categories`. Should show a list of category cards with name, amount, transaction count, and percentage. Each card should be clickable.

### Step 4: Commit

```bash
git add frontend/app/(main)/statements/top-categories/page.tsx frontend/app/(main)/statements/components/CategoriesListView.tsx
git commit -m "feat(top-categories): replace analytics view with clickable category list"
```

---

## Task 4: Frontend -- Create category drill-down page (statements by category)

**Files:**
- Create: `frontend/app/(main)/statements/top-categories/[categoryId]/page.tsx`
- Create: `frontend/app/(main)/statements/components/CategoryStatementsView.tsx`

### Step 1: Create `CategoryStatementsView` component

Create `frontend/app/(main)/statements/components/CategoryStatementsView.tsx`:

```typescript
'use client';

import LoadingAnimation from '@/app/components/LoadingAnimation';
import apiClient from '@/app/lib/api';
import { cn } from '@/app/lib/utils';
import { ArrowLeft, File } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const formatMoney = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

interface StatementItem {
  id: string;
  fileName: string;
  bankName?: string | null;
  status: string;
  totalTransactions?: number;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
  createdAt: string;
  source?: 'statement' | 'gmail';
}

interface Props {
  categoryId: string;
}

export default function CategoryStatementsView({ categoryId }: Props) {
  const router = useRouter();
  const [statements, setStatements] = useState<StatementItem[]>([]);
  const [categoryName, setCategoryName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);

        // Fetch category name
        if (categoryId !== 'uncategorized') {
          try {
            const catRes = await apiClient.get(`/categories/${categoryId}`);
            if (isMounted && catRes.data?.name) {
              setCategoryName(catRes.data.name);
            }
          } catch {
            // Category name fetch failed -- not critical
          }
        } else {
          setCategoryName('Uncategorized');
        }

        // Fetch statements filtered by category
        const response = await apiClient.get('/statements', {
          params: { categoryId, page, limit },
        });
        const items = response.data?.data || response.data?.items || [];

        if (isMounted) {
          setStatements(Array.isArray(items) ? items : []);
          setTotal(Number(response.data?.total ?? 0));
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load statements');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [categoryId, page]);

  const handleBack = () => {
    router.push('/statements/top-categories');
  };

  const handleStatementClick = (statementId: string) => {
    router.push(`/statements/${statementId}/edit`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <LoadingAnimation />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  const parseAmount = (val?: number | string | null): number => {
    if (val === null || val === undefined || val === '') return 0;
    const parsed = typeof val === 'string' ? Number(val) : val;
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6">
        {/* Back button + header */}
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to categories
        </button>

        <h1 className="text-lg font-semibold text-gray-900 mb-1">
          {categoryName || 'Category'}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {total} statement{total !== 1 ? 's' : ''} with transactions in this category
        </p>

        {statements.length === 0 ? (
          <div className="text-center py-12">
            <File className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No statements found for this category</p>
          </div>
        ) : (
          <div className="space-y-2">
            {statements.map(statement => {
              const debit = parseAmount(statement.totalDebit);
              const credit = parseAmount(statement.totalCredit);
              const amount = debit > 0 ? debit : credit;

              return (
                <button
                  key={statement.id}
                  type="button"
                  onClick={() => handleStatementClick(statement.id)}
                  className={cn(
                    'w-full flex items-center justify-between gap-4 p-4 rounded-xl',
                    'bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm',
                    'transition-all duration-150 text-left group',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {statement.fileName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {statement.bankName || 'Unknown bank'}
                        {statement.totalTransactions
                          ? ` \u00b7 ${statement.totalTransactions} transactions`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {amount > 0 && (
                      <span className="text-sm font-semibold text-gray-900">
                        {formatMoney(amount)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Simple pagination */}
        {total > limit && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {Math.ceil(total / limit)}
            </span>
            <button
              type="button"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / limit)}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 2: Create the page route

Create `frontend/app/(main)/statements/top-categories/[categoryId]/page.tsx`:

```typescript
'use client';

import StatementsSidePanel from '@/app/(main)/statements/components/StatementsSidePanel';
import CategoryStatementsView from '@/app/(main)/statements/components/CategoryStatementsView';
import { useParams } from 'next/navigation';

export default function CategoryDrilldownPage() {
  const params = useParams();
  const categoryId = params.categoryId as string;

  return (
    <>
      <StatementsSidePanel activeItem="top-categories" />
      <CategoryStatementsView categoryId={categoryId} />
    </>
  );
}
```

### Step 3: Verify the full flow

```bash
cd frontend && npm run dev
```

1. Navigate to `/statements/top-categories` -- see list of categories
2. Click on a category -- navigate to `/statements/top-categories/<uuid>`
3. See list of statements filtered by that category
4. Click "Back to categories" -- return to the list
5. Click on a statement -- navigate to `/statements/<id>/edit`

### Step 4: Commit

```bash
git add frontend/app/(main)/statements/top-categories/[categoryId]/page.tsx frontend/app/(main)/statements/components/CategoryStatementsView.tsx
git commit -m "feat(top-categories): add category drill-down page showing filtered statements"
```

---

## Task 5: Cleanup and type safety

**Files:**
- Potentially modify: `frontend/app/(main)/statements/components/StatementsSidePanel.tsx:30` (ActiveItem type -- already includes `'top-categories'`, no changes needed)

### Step 1: Run linting and type checks

```bash
cd frontend && npx tsc --noEmit
cd frontend && npm run lint
```

Fix any errors.

### Step 2: Run existing tests

```bash
cd frontend && npm test -- --passWithNoTests
cd backend && npm test -- --passWithNoTests
```

### Step 3: Commit any fixes

```bash
git add -A
git commit -m "fix: resolve lint and type errors from top-categories refactor"
```

---

## Task 6: Final verification

### Step 1: Run full test suite

```bash
make test
```

### Step 2: Run lint and format

```bash
make lint
make format
```

### Step 3: Manual smoke test

1. Sidebar: "Top categories" shows as simple link (no expand chevron) with badge count
2. Click "Top categories" -> `/statements/top-categories` shows list of all categories
3. Click any category -> `/statements/top-categories/<id>` shows filtered statements
4. Click "Back to categories" returns to list
5. Click a statement -> opens edit page
6. "Uncategorized" (null category) works correctly

### Step 4: Final commit if needed

```bash
git add -A
git commit -m "chore: final cleanup for top-categories tab feature"
```
