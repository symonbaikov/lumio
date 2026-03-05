# Dashboard & Reports Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure Dashboard as the "what's happening + what to do" hub (Overview, Trends, Data Health + persistent Quick Actions bar), and transform Reports into a Report Builder (templates, export, history).

**Architecture:** Dashboard (`/`) becomes a 3-tab page with persistent Quick Actions bar, pulling analytical content from the old Reports page. Reports (`/reports`) becomes a template-based report generator with P&L, Balance Sheet, Cash Flow, and Expense by Category templates, multi-format export, and generation history. Transaction tab moves to `/statements`.

**Tech Stack:** Next.js 14, TypeScript, MUI Tabs, ECharts (echarts-for-react), NestJS backend, TypeORM, ExcelJS/PDFKit for exports.

---

## Phase 1: Dashboard Redesign (Frontend)

### Task 1: Create new Dashboard tab components skeleton

**Files:**
- Create: `frontend/app/components/dashboard/TrendsTab.tsx`
- Create: `frontend/app/components/dashboard/DataHealthTab.tsx`
- Create: `frontend/app/components/dashboard/QuickActionsBar.tsx`

**Step 1: Create TrendsTab skeleton**

Create `frontend/app/components/dashboard/TrendsTab.tsx`:

```tsx
'use client';

import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';

interface TrendsTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  isLoading?: boolean;
}

export function TrendsTab({ data, formatAmount, range, isLoading }: TrendsTabProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <p className="text-slate-400 text-sm">Trends tab — coming next</p>
    </div>
  );
}
```

**Step 2: Create DataHealthTab skeleton**

Create `frontend/app/components/dashboard/DataHealthTab.tsx`:

```tsx
'use client';

import type { DashboardData, DashboardRange } from '@/app/hooks/useDashboard';

interface DataHealthTabProps {
  data: DashboardData;
  formatAmount: (value: number) => string;
  range: DashboardRange;
  isLoading?: boolean;
}

export function DataHealthTab({ data, formatAmount, range, isLoading }: DataHealthTabProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <p className="text-slate-400 text-sm">Data Health tab — coming next</p>
    </div>
  );
}
```

**Step 3: Create QuickActionsBar component**

Create `frontend/app/components/dashboard/QuickActionsBar.tsx`:

```tsx
'use client';

import { Button } from '@/app/components/ui/button';
import { Download, FileUp, ListChecks } from 'lucide-react';
import Link from 'next/link';

interface QuickActionsBarProps {
  reviewCount?: number;
}

export function QuickActionsBar({ reviewCount }: QuickActionsBarProps) {
  const actions = [
    { key: 'upload', label: 'Upload / Parse', href: '/statements/submit', icon: FileUp },
    {
      key: 'review',
      label: `Review queue${reviewCount ? ` (${reviewCount})` : ''}`,
      href: '/statements?filter=needs_review',
      icon: ListChecks,
    },
    { key: 'export', label: 'Export', href: '/reports', icon: Download },
  ] as const;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {actions.map(action => (
        <Link key={action.key} href={action.href}>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary hover:bg-primary/5 shadow-sm text-xs h-8"
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add frontend/app/components/dashboard/TrendsTab.tsx frontend/app/components/dashboard/DataHealthTab.tsx frontend/app/components/dashboard/QuickActionsBar.tsx
git commit -m "feat(dashboard): add skeleton components for Trends, Data Health tabs and QuickActionsBar"
```

---

### Task 2: Rewire Dashboard page to new 3-tab layout with Quick Actions bar

**Files:**
- Modify: `frontend/app/page.tsx` (full rewrite of tab structure)

**Step 1: Update page.tsx — replace 3 old tabs with 3 new tabs + persistent QuickActionsBar**

In `frontend/app/page.tsx`:

1. Remove imports: `FinlabBalanceStatCard`, `FinlabExpenseCard`, `FinlabExpenseCategoryCard`, `FinlabIncomeCard`, `FinlabTransactionCard`, `TransactionTab`
2. Add imports: `TrendsTab`, `DataHealthTab`, `QuickActionsBar`
3. Change `activeTab` state type from `'overview' | 'transaction' | 'statistics'` to `'overview' | 'trends' | 'data-health'`
4. Replace the `<Tabs>` component to show "Overview", "Trends", "Data Health" tabs
5. Replace the content body to render:
   - `<QuickActionsBar>` (persistent, above tab content)
   - Tab-conditional content: `<OverviewTab>`, `<TrendsTab>`, `<DataHealthTab>`
6. Remove the entire `activeTab === 'statistics'` block (Finlab cards)
7. Remove the entire `activeTab === 'transaction'` block (TransactionTab)

The key changes in the JSX:

```tsx
// Import changes
import { TrendsTab } from './components/dashboard/TrendsTab';
import { DataHealthTab } from './components/dashboard/DataHealthTab';
import { QuickActionsBar } from './components/dashboard/QuickActionsBar';
// Remove: FinlabBalanceStatCard, FinlabExpenseCard, FinlabExpenseCategoryCard,
//         FinlabIncomeCard, FinlabTransactionCard, TransactionTab

// State change
const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'data-health'>('overview');

// Tab definitions — replace existing 3 tabs
<Tab value="overview" label="Overview" ... />
<Tab value="trends" label="Trends" ... />
<Tab value="data-health" label="Data Health" ... />

// Content body — add QuickActionsBar before tab content
<div className="bg-[#f4f7f9] ...">
  {/* Persistent Quick Actions Bar */}
  <div className="mb-6">
    <QuickActionsBar
      reviewCount={data?.actions?.filter(a =>
        ['statements_pending_review', 'receipts_pending_review'].includes(a.type)
      ).reduce((sum, a) => sum + a.count, 0) || 0}
    />
  </div>

  {activeTab === 'overview' && (
    <OverviewTab data={data} formatAmount={formatAmount} range={range} isLoading={loading} />
  )}
  {activeTab === 'trends' && (
    <TrendsTab data={data} formatAmount={formatAmount} range={range} isLoading={loading} />
  )}
  {activeTab === 'data-health' && (
    <DataHealthTab data={data} formatAmount={formatAmount} range={range} isLoading={loading} />
  )}
</div>
```

**Step 2: Run lint and verify no build errors**

```bash
cd frontend && npx biome check app/page.tsx --apply && npm run build
```

**Step 3: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "feat(dashboard): rewire to Overview/Trends/Data Health tabs with persistent Quick Actions bar"
```

---

### Task 3: Extend useDashboard hook and backend to provide data health metrics

**Files:**
- Modify: `frontend/app/hooks/useDashboard.ts` (add `dataHealth` to DashboardData)
- Modify: `backend/src/modules/dashboard/dashboard.service.ts` (add `getDataHealth` method)
- Modify: `backend/src/modules/dashboard/interfaces/dashboard-response.interface.ts`

**Step 1: Add DataHealth interface to frontend hook**

In `frontend/app/hooks/useDashboard.ts`, add after `DashboardTopMerchant`:

```typescript
export interface DashboardDataHealth {
  uncategorizedTransactions: number;
  statementsWithErrors: number;
  statementsPendingReview: number;
  unapprovedCash: number;
  isBalanceBalanced: boolean | null; // null if no balance sheet
  balanceDifference: number;
  lastUploadDate: string | null;
  parsingWarnings: number; // statements in 'processing' or 'uploaded' status
}
```

Add `dataHealth: DashboardDataHealth;` to `DashboardData` interface.

**Step 2: Add DataHealth to backend interface**

In `backend/src/modules/dashboard/interfaces/dashboard-response.interface.ts`, add `DataHealth` interface matching the frontend definition, and add `dataHealth` to the response.

**Step 3: Implement getDataHealth in DashboardService**

In `backend/src/modules/dashboard/dashboard.service.ts`, add a new method `getDataHealth(userId, workspaceId)` that performs:

1. Count uncategorized transactions: `transactionRepo.createQueryBuilder().where('categoryId IS NULL AND isDuplicate = false')` (already done in getActions, extract into shared query)
2. Count statement errors: `statementRepo.count({ where: { status: 'error', workspace: { id: workspaceId } } })`
3. Count statements pending review: `statementRepo.count({ where: { status: In(['parsed', 'validated']), workspace: { id: workspaceId } } })`
4. Get unapprovedCash from snapshot (already calculated, reuse)
5. Call balance service to check `isBalanced` + `difference` (if balance module is injected, otherwise return null)
6. Get latest statement upload date: `statementRepo.findOne({ order: { createdAt: 'DESC' } })`
7. Count parsing warnings: statements in 'processing'/'uploaded' status

Add this to the `Promise.all` in `getDashboard()` alongside existing queries.

**Step 4: Write backend test for getDataHealth**

In `backend/@tests/unit/modules/dashboard/dashboard.service.spec.ts`, add test:

```typescript
it('should include dataHealth in response', async () => {
  const result = await service.getDashboard(userId, workspaceId, '30d');
  expect(result).toHaveProperty('dataHealth');
  expect(result.dataHealth).toMatchObject({
    uncategorizedTransactions: expect.any(Number),
    statementsWithErrors: expect.any(Number),
    statementsPendingReview: expect.any(Number),
    unapprovedCash: expect.any(Number),
    parsingWarnings: expect.any(Number),
  });
});
```

**Step 5: Run tests**

```bash
cd backend && npm run test -- --testPathPattern=dashboard
```

**Step 6: Commit**

```bash
git add frontend/app/hooks/useDashboard.ts backend/src/modules/dashboard/
git commit -m "feat(dashboard): add data health metrics to dashboard API and hook"
```

---

### Task 4: Extend useDashboard hook to fetch Reports trend data (Sheets + Local + Statements)

The Trends tab needs data that currently lives only in the Reports page (fetched from separate endpoints). 

**Approach:** Add a new backend endpoint `GET /dashboard/trends` that aggregates trend data from all sources (Google Sheets, Local tables, Statements) into a single response. This keeps the frontend clean — one hook, one call.

**Files:**
- Modify: `backend/src/modules/dashboard/dashboard.service.ts` (add `getTrends`)
- Modify: `backend/src/modules/dashboard/dashboard.controller.ts` (add `GET /dashboard/trends`)
- Create: `backend/src/modules/dashboard/interfaces/dashboard-trends.interface.ts`
- Modify: `frontend/app/hooks/useDashboard.ts` (add `useDashboardTrends` hook)

**Step 1: Create trends interface**

Create `backend/src/modules/dashboard/interfaces/dashboard-trends.interface.ts`:

```typescript
export interface DashboardTrendsResponse {
  // Combined daily income/expense from all sources
  dailyTrend: Array<{ date: string; income: number; expense: number }>;
  // Top expense categories across all sources
  categories: Array<{ name: string; amount: number; count: number }>;
  // Top income counterparties across all sources
  counterparties: Array<{ name: string; amount: number; count: number }>;
  // Source breakdown
  sources: {
    sheets: { income: number; expense: number; rows: number };
    local: { income: number; expense: number; rows: number };
    statements: { income: number; expense: number; rows: number };
  };
}
```

**Step 2: Implement getTrends in DashboardService**

Inject `ReportsService` and `GoogleSheetsAnalyticsService` (or their respective modules) into DashboardModule. The `getTrends` method calls the existing service methods in parallel:

```typescript
async getTrends(userId: string, workspaceId: string, days: number = 30) {
  const [sheetsSummary, statementsSummary] = await Promise.all([
    this.googleSheetsAnalyticsService.getSummary(userId, days).catch(() => null),
    this.reportsService.getStatementsSummary(userId, days).catch(() => null),
  ]);
  // Merge timeseries, categories, counterparties from both sources
  // Return combined DashboardTrendsResponse
}
```

**Step 3: Add endpoint to controller**

```typescript
@Get('trends')
async getTrends(
  @CurrentUser() user: User,
  @Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number,
) {
  return this.dashboardService.getTrends(user.id, user.workspaceId, days);
}
```

**Step 4: Create frontend hook**

In `frontend/app/hooks/useDashboard.ts`, add `useDashboardTrends`:

```typescript
export interface DashboardTrends {
  dailyTrend: Array<{ date: string; income: number; expense: number }>;
  categories: Array<{ name: string; amount: number; count: number }>;
  counterparties: Array<{ name: string; amount: number; count: number }>;
  sources: {
    sheets: { income: number; expense: number; rows: number };
    local: { income: number; expense: number; rows: number };
    statements: { income: number; expense: number; rows: number };
  };
}

export function useDashboardTrends(days: number = 30) {
  const [data, setData] = useState<DashboardTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/dashboard/trends', { params: { days } });
      setData(res.data?.data || res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load trends');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refresh: load };
}
```

**Step 5: Write backend test and run**

```bash
cd backend && npm run test -- --testPathPattern=dashboard
```

**Step 6: Commit**

```bash
git add backend/src/modules/dashboard/ frontend/app/hooks/useDashboard.ts
git commit -m "feat(dashboard): add /dashboard/trends endpoint aggregating all data sources"
```

---

### Task 5: Implement TrendsTab with charts from old Reports

**Files:**
- Modify: `frontend/app/components/dashboard/TrendsTab.tsx` (full implementation)

This tab replicates the analytical visualizations from the old Reports page. Content:

1. **Source KPIs** — 3 cards showing Sheets / Local / Statements income/expense/rows totals
2. **Daily Trend chart** — combined income vs expense line chart (from `dailyTrend`)
3. **Expense Categories** — rose-type pie chart (from `categories`)
4. **Income by Counterparty** — horizontal bar chart (from `counterparties`)

**Step 1: Implement TrendsTab with all charts**

Import `echarts-for-react` dynamically (same pattern as old Reports page). Use `useDashboardTrends()` hook inside the component.

Chart configurations follow the exact same ECharts options that exist in the old `reports/page.tsx`:

- **Daily Trend**: smooth line chart, blue (#0EA5E9) for income, red (#DC2626) for expense, area fill, tooltip
- **Expense Categories**: rose-type pie, top-10, pastel palette
- **Income by Counterparty**: horizontal bar, top-10, blue bars, rounded corners

Layout: 2/3 + 1/3 grid for first row (trend + pie), 1/3 + 2/3 for second row (bar + source breakdown).

The component should include a day selector (7d/30d/90d) that controls the `days` parameter passed to `useDashboardTrends`.

**Step 2: Run build**

```bash
cd frontend && npm run build
```

**Step 3: Commit**

```bash
git add frontend/app/components/dashboard/TrendsTab.tsx
git commit -m "feat(dashboard): implement Trends tab with daily trend, categories, counterparty charts"
```

---

### Task 6: Implement DataHealthTab

**Files:**
- Modify: `frontend/app/components/dashboard/DataHealthTab.tsx` (full implementation)

This tab shows data quality metrics using `data.dataHealth` from the existing dashboard API response (added in Task 3).

**Layout:**

1. **Summary strip** — 4 metric cards in a row:
   - Uncategorized transactions (amber if > 0, green if 0)
   - Statements with errors (red if > 0, green if 0)
   - Pending review (blue if > 0, green if 0)
   - Parsing warnings (amber if > 0, green if 0)

2. **Balance status** — conditional banner:
   - If `isBalanceBalanced === false`: amber warning card showing difference amount
   - If `isBalanceBalanced === true`: green "balanced" confirmation
   - If `null`: muted card "No balance sheet configured"

3. **Unapproved cash** — card showing amount of cash from unapproved statements with link to review

4. **Last upload** — shows `lastUploadDate` with relative time (e.g., "2 days ago") and CTA to upload

5. **Quick links** — contextual links based on which metrics have issues:
   - "Review N uncategorized transactions" -> `/statements?filter=uncategorized`
   - "Fix N statement errors" -> `/statements?filter=errors`
   - "Review N pending statements" -> `/statements?filter=needs_review`

**Step 1: Implement DataHealthTab**

Use the card styles from `common.ts` (`cardShell`). Color coding: green (healthy), amber (needs attention), red (critical).

**Step 2: Run build**

```bash
cd frontend && npm run build
```

**Step 3: Commit**

```bash
git add frontend/app/components/dashboard/DataHealthTab.tsx
git commit -m "feat(dashboard): implement Data Health tab with quality metrics and contextual links"
```

---

### Task 7: Update i18n content for new Dashboard tabs

**Files:**
- Modify: `frontend/app/page.content.ts`

**Step 1: Add i18n keys for new tabs and sections**

Add to the `dashboardPage` content object:

```typescript
tabs: {
  overview: t({ ru: 'Обзор', en: 'Overview', kk: 'Шолу' }),
  trends: t({ ru: 'Тренды', en: 'Trends', kk: 'Трендтер' }),
  dataHealth: t({ ru: 'Качество данных', en: 'Data Health', kk: 'Деректер сапасы' }),
},
quickActions: {
  upload: t({ ru: 'Загрузить / Распарсить', en: 'Upload / Parse', kk: 'Жүктеу / Талдау' }),
  review: t({ ru: 'Очередь на проверку', en: 'Review queue', kk: 'Тексеру кезегі' }),
  export: t({ ru: 'Экспорт', en: 'Export', kk: 'Экспорт' }),
},
dataHealth: {
  uncategorized: t({ ru: 'Без категории', en: 'Uncategorized', kk: 'Санатсыз' }),
  errors: t({ ru: 'Ошибки', en: 'Errors', kk: 'Қателер' }),
  pendingReview: t({ ru: 'На проверке', en: 'Pending review', kk: 'Тексеруде' }),
  parsingWarnings: t({ ru: 'Предупреждения', en: 'Parsing warnings', kk: 'Ескертулер' }),
  balanceOk: t({ ru: 'Баланс сведён', en: 'Balance is balanced', kk: 'Баланс теңестірілген' }),
  balanceWarning: t({ ru: 'Баланс не сведён', en: 'Balance mismatch', kk: 'Баланс сәйкес емес' }),
  noBalance: t({ ru: 'Баланс не настроен', en: 'No balance sheet', kk: 'Баланс жоқ' }),
  lastUpload: t({ ru: 'Последняя загрузка', en: 'Last upload', kk: 'Соңғы жүктеу' }),
  unapprovedCash: t({ ru: 'Неподтверждённые', en: 'Unapproved cash', kk: 'Расталмаған' }),
},
trends: {
  dailyTrend: t({ ru: 'Ежедневный тренд', en: 'Daily trend', kk: 'Күнделікті тренд' }),
  categories: t({ ru: 'Категории расходов', en: 'Expense categories', kk: 'Шығыс санаттары' }),
  counterparties: t({ ru: 'Доход по контрагентам', en: 'Income by counterparty', kk: 'Контрагент бойынша түсім' }),
  sources: t({ ru: 'Источники данных', en: 'Data sources', kk: 'Деректер көздері' }),
},
```

**Step 2: Commit**

```bash
git add frontend/app/page.content.ts
git commit -m "feat(dashboard): add i18n content for Trends, Data Health tabs and Quick Actions"
```

---

## Phase 2: Reports -> Report Builder (Frontend + Backend)

### Task 8: Create Report Builder page structure

**Files:**
- Create: `frontend/app/(main)/reports/components/ReportTemplateCard.tsx`
- Create: `frontend/app/(main)/reports/components/ReportHistory.tsx`
- Create: `frontend/app/(main)/reports/components/ReportGenerator.tsx`
- Keep: `frontend/app/(main)/reports/components/BalanceSheet.tsx` (reused as template)

**Step 1: Create ReportTemplateCard component**

```tsx
// frontend/app/(main)/reports/components/ReportTemplateCard.tsx
'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import type { LucideIcon } from 'lucide-react';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: 'financial' | 'operational' | 'tax';
  formats: Array<'pdf' | 'excel' | 'csv' | 'google-sheets'>;
}

interface ReportTemplateCardProps {
  template: ReportTemplate;
  onSelect: (template: ReportTemplate) => void;
}

export function ReportTemplateCard({ template, onSelect }: ReportTemplateCardProps) {
  return (
    <Card
      className="group cursor-pointer border border-slate-100 bg-white shadow-sm rounded-[20px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/20"
      onClick={() => onSelect(template)}
    >
      <CardContent className="p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <template.icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{template.name}</h3>
            <p className="text-xs text-slate-500">{template.description}</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {template.formats.map(f => (
            <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase font-medium">
              {f}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create ReportGenerator component**

This is the panel that opens when a template is selected. It shows:
- Template name and description
- Parameters: date range (from/to)
- Output format radio: PDF / Excel / CSV
- "Generate" button
- Loading state while generating

```tsx
// frontend/app/(main)/reports/components/ReportGenerator.tsx
'use client';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Download, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import type { ReportTemplate } from './ReportTemplateCard';

export interface ReportGenerateParams {
  templateId: string;
  dateFrom: string;
  dateTo: string;
  format: 'pdf' | 'excel' | 'csv';
}

interface ReportGeneratorProps {
  template: ReportTemplate;
  onClose: () => void;
  onGenerate: (params: ReportGenerateParams) => Promise<void>;
}

export function ReportGenerator({ template, onClose, onGenerate }: ReportGeneratorProps) {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>('excel');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerate({ templateId: template.id, dateFrom, dateTo, format });
    } finally {
      setGenerating(false);
    }
  };

  // Full JSX: Card with date inputs, format radio buttons, generate button, close button
  // Renders as an overlay/panel below the templates grid
}
```

**Step 3: Create ReportHistory component**

```tsx
// frontend/app/(main)/reports/components/ReportHistory.tsx
'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Download, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import apiClient from '@/app/lib/api';

export interface ReportHistoryItem {
  id: string;
  templateId: string;
  templateName: string;
  dateFrom: string;
  dateTo: string;
  format: string;
  generatedBy: string;
  generatedAt: string;
  downloadUrl: string;
  fileSize: number;
}

export function ReportHistory() {
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/reports/history')
      .then(res => setHistory(res.data?.data || res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Renders table/list: template name, date range, format badge,
  // generated by (user name), generated at (relative time),
  // file size, download button
}
```

**Step 4: Commit**

```bash
git add frontend/app/(main)/reports/components/
git commit -m "feat(reports): create ReportTemplateCard, ReportGenerator, ReportHistory components"
```

---

### Task 9: Rewrite Reports page.tsx as Report Builder

**Files:**
- Rewrite: `frontend/app/(main)/reports/page.tsx`

**Step 1: Replace the 1829-line monolith with Report Builder**

The new Reports page has 2 tabs:
1. **Templates** — grid of report template cards
2. **History** — table of previously generated reports

```tsx
'use client';

import { Tab, Tabs } from '@mui/material';
import { BarChart3, DollarSign, PieChart, Scale } from 'lucide-react';
import { useState } from 'react';
import BalanceSheet from './components/BalanceSheet';
import { ReportGenerator, type ReportGenerateParams } from './components/ReportGenerator';
import { ReportHistory } from './components/ReportHistory';
import { type ReportTemplate, ReportTemplateCard } from './components/ReportTemplateCard';
import apiClient from '@/app/lib/api';

const templates: ReportTemplate[] = [
  {
    id: 'pnl',
    name: 'Profit & Loss (P&L)',
    description: 'Income and expenses summary with net profit for a period',
    icon: DollarSign,
    category: 'financial',
    formats: ['pdf', 'excel', 'csv'],
  },
  {
    id: 'balance-sheet',
    name: 'Balance Sheet',
    description: 'Assets, liabilities and equity snapshot',
    icon: Scale,
    category: 'financial',
    formats: ['pdf', 'excel'],
  },
  {
    id: 'cash-flow',
    name: 'Cash Flow Statement',
    description: 'Cash inflows and outflows over a period',
    icon: BarChart3,
    category: 'financial',
    formats: ['pdf', 'excel', 'csv'],
  },
  {
    id: 'expense-by-category',
    name: 'Expense by Category',
    description: 'Breakdown of expenses by category with totals',
    icon: PieChart,
    category: 'operational',
    formats: ['pdf', 'excel', 'csv'],
  },
];

export default function ReportsPage() {
  const [tab, setTab] = useState<'templates' | 'history'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [showBalanceSheet, setShowBalanceSheet] = useState(false);

  const handleSelectTemplate = (template: ReportTemplate) => {
    if (template.id === 'balance-sheet') {
      setShowBalanceSheet(true);
      return;
    }
    setSelectedTemplate(template);
  };

  const handleGenerate = async (params: ReportGenerateParams) => {
    const response = await apiClient.post('/reports/generate', params, {
      responseType: 'blob',
    });
    // Trigger browser file download from blob
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${params.templateId}-report.${params.format === 'excel' ? 'xlsx' : params.format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (showBalanceSheet) {
    return (
      <div className="p-8">
        <button onClick={() => setShowBalanceSheet(false)}
                className="mb-4 text-sm text-primary hover:underline">
          Back to templates
        </button>
        <BalanceSheet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f9]">
      <div className="px-8 pt-8 pb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500 mt-1">
          Generate financial reports and export documents
        </p>
      </div>

      <div className="px-8 border-b border-slate-200">
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab value="templates" label="Templates" />
          <Tab value="history" label="History" />
        </Tabs>
      </div>

      <div className="px-8 py-6">
        {tab === 'templates' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map(tmpl => (
                <ReportTemplateCard
                  key={tmpl.id}
                  template={tmpl}
                  onSelect={handleSelectTemplate}
                />
              ))}
            </div>
            {selectedTemplate && (
              <ReportGenerator
                template={selectedTemplate}
                onClose={() => setSelectedTemplate(null)}
                onGenerate={handleGenerate}
              />
            )}
          </>
        )}
        {tab === 'history' && <ReportHistory />}
      </div>
    </div>
  );
}
```

**Step 2: Run build**

```bash
cd frontend && npm run build
```

**Step 3: Commit**

```bash
git add frontend/app/(main)/reports/page.tsx
git commit -m "feat(reports): rewrite Reports page as Report Builder with templates and history"
```

---

### Task 10: Backend — Report generation endpoint and history

**Files:**
- Modify: `backend/src/modules/reports/reports.controller.ts` (add `POST /reports/generate`, `GET /reports/history`)
- Modify: `backend/src/modules/reports/reports.service.ts` (add `generateFromTemplate`, `getHistory`)
- Create: `backend/src/entities/report-history.entity.ts`
- Create: `backend/src/modules/reports/dto/generate-report.dto.ts`
- Create migration for `report_history` table

**Step 1: Create ReportHistory entity**

```typescript
// backend/src/entities/report-history.entity.ts
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';

@Entity('report_history')
export class ReportHistory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() workspaceId: string;
  @Column() userId: string;
  @Column() templateId: string;  // 'pnl', 'balance-sheet', 'cash-flow', 'expense-by-category'
  @Column() templateName: string;
  @Column() dateFrom: string;
  @Column() dateTo: string;
  @Column() format: string;      // 'pdf', 'excel', 'csv'
  @Column({ nullable: true }) filePath: string;
  @Column({ nullable: true }) fileName: string;
  @Column({ type: 'int', default: 0 }) fileSize: number;
  @CreateDateColumn() generatedAt: Date;

  @ManyToOne(() => User) user: User;
  @ManyToOne(() => Workspace) workspace: Workspace;
}
```

**Step 2: Create migration**

```bash
cd backend && npm run migration:generate -- src/migrations/AddReportHistory
```

**Step 3: Create GenerateReportDto**

```typescript
// backend/src/modules/reports/dto/generate-report.dto.ts
import { IsDateString, IsIn, IsString } from 'class-validator';

export class GenerateReportDto {
  @IsString() templateId: string;
  @IsDateString() dateFrom: string;
  @IsDateString() dateTo: string;
  @IsIn(['pdf', 'excel', 'csv']) format: string;
}
```

**Step 4: Implement generateFromTemplate in ReportsService**

```typescript
async generateFromTemplate(userId: string, dto: GenerateReportDto) {
  switch (dto.templateId) {
    case 'pnl':
      return this.generatePnLReport(userId, dto);
    case 'cash-flow':
      return this.generateCashFlowReport(userId, dto);
    case 'expense-by-category':
      return this.generateExpenseByCategoryReport(userId, dto);
    default:
      throw new BadRequestException('Unknown template');
  }
}
```

**Step 5: Add controller endpoints**

```typescript
@Post('generate')
@UseGuards(PermissionsGuard)
@RequirePermission(Permission.REPORT_EXPORT)
async generateReport(
  @CurrentUser() user: User,
  @Body() dto: GenerateReportDto,
  @Res() res: Response,
) {
  const { filePath, fileName, contentType } = await this.reportsService.generateFromTemplate(user.id, dto);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', buildContentDisposition('attachment', fileName));
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  fileStream.on('end', () => fs.unlinkSync(filePath));
}

@Get('history')
@UseGuards(PermissionsGuard)
@RequirePermission(Permission.REPORT_VIEW)
async getHistory(@CurrentUser() user: User) {
  return this.reportsService.getReportHistory(user.id);
}
```

**Step 6: Implement getReportHistory**

```typescript
async getReportHistory(userId: string) {
  const workspace = await this.getWorkspace(userId);
  return this.reportHistoryRepo.find({
    where: { workspaceId: workspace.id },
    order: { generatedAt: 'DESC' },
    take: 50,
    relations: ['user'],
  });
}
```

**Step 7: Run tests**

```bash
cd backend && npm run test -- --testPathPattern=reports
```

**Step 8: Commit**

```bash
git add backend/src/entities/report-history.entity.ts backend/src/modules/reports/ backend/src/migrations/
git commit -m "feat(reports): add report generation endpoint, history entity, and template-based generation"
```

---

### Task 11: Implement P&L report template generator

**Files:**
- Modify: `backend/src/modules/reports/reports.service.ts`

**Step 1: Implement generatePnLReport**

The P&L report generates a structured income statement:

1. Query all transactions in [dateFrom, dateTo] grouped by category
2. Separate into income categories and expense categories
3. Calculate: Total Revenue, Total Expenses, Net Income
4. Format into sections: Revenue, Operating Expenses, Net Income
5. Export to requested format (Excel with formatted rows / CSV flat / PDF with layout)

Uses ExcelJS (already a dependency for balance export):
```typescript
const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('P&L');
// Header row: company/workspace name, period
// Revenue section: category rows with amounts
// Total Revenue row (bold)
// Expense section: category rows with amounts
// Total Expenses row (bold)
// Net Income row (bold, green/red)
```

Records a `ReportHistory` entry upon successful generation.

**Step 2: Run tests**

```bash
cd backend && npm run test -- --testPathPattern=reports
```

**Step 3: Commit**

```bash
git add backend/src/modules/reports/reports.service.ts
git commit -m "feat(reports): implement P&L report template with Excel/CSV/PDF export"
```

---

### Task 12: Implement Cash Flow and Expense by Category report generators

**Files:**
- Modify: `backend/src/modules/reports/reports.service.ts`

**Step 1: Implement generateCashFlowReport**

Cash Flow statement groups transactions into:
- Operating activities (regular income/expense)
- Net cash flow per period (daily/weekly/monthly depending on range)

Data source: reuse `getSpendOverTimeReport` or direct transaction queries.

**Step 2: Implement generateExpenseByCategoryReport**

Expense breakdown by category with:
- Category name, total amount, transaction count, % of total
- Sorted by amount descending

Data source: reuse `getTopCategoriesReport` (but without limit).

**Step 3: Run tests**

```bash
cd backend && npm run test -- --testPathPattern=reports
```

**Step 4: Commit**

```bash
git add backend/src/modules/reports/reports.service.ts
git commit -m "feat(reports): implement Cash Flow and Expense by Category report templates"
```

---

## Phase 3: Navigation, Cleanup & Tests

### Task 13: Move Transaction table to Statements page

**Files:**
- Modify: `frontend/app/(main)/statements/page.tsx` (or relevant statements component)
- The `TransactionTab` component exists at `frontend/app/components/dashboard/TransactionTab.tsx`

**Step 1: Add Transactions tab/section to Statements page**

Add a new tab or section in the Statements page that renders `<TransactionTab />`. This ensures users can still access the transaction table with bulk category assignment.

**Step 2: Verify the component works in the new location**

```bash
cd frontend && npm run build
```

**Step 3: Commit**

```bash
git add frontend/app/(main)/statements/
git commit -m "feat(statements): add Transaction table tab (moved from Dashboard)"
```

---

### Task 14: Update i18n for Reports page

**Files:**
- Modify: `frontend/app/(main)/reports/page.content.ts`

**Step 1: Replace old Reports i18n with Report Builder labels**

Replace entire content with new keys for: title, subtitle, tabs (templates/history), template names+descriptions, generator labels, history table headers. Support ru/en/kk.

**Step 2: Commit**

```bash
git add frontend/app/(main)/reports/page.content.ts
git commit -m "feat(reports): update i18n content for Report Builder"
```

---

### Task 15: Update Reports tour

**Files:**
- Modify: `frontend/app/tours/reports-tour.ts`
- Modify: `frontend/app/tours/reports-tour.content.ts`

**Step 1: Update tour steps to match new Report Builder layout**

Replace old tour steps (which reference tabs like "Google Sheets", "Local", etc.) with new steps:
1. Welcome to Report Builder
2. Browse templates
3. Select a template and configure parameters
4. Choose export format
5. View generation history

**Step 2: Commit**

```bash
git add frontend/app/tours/reports-tour.ts frontend/app/tours/reports-tour.content.ts
git commit -m "feat(reports): update guided tour for Report Builder layout"
```

---

### Task 16: Remove unused old Reports code and clean up dashboard components

**Files:**
- Remove: `frontend/app/(main)/reports/reportChartLayout.ts` (no longer needed)
- Remove: `frontend/app/(main)/reports/reportChartLayout.test.ts`
- Remove unused dashboard components confirmed not imported anywhere:
  - `frontend/app/components/dashboard/DashboardHero.tsx`
  - `frontend/app/components/dashboard/FinanceChart.tsx`
  - `frontend/app/components/dashboard/IncomeExpenseBreakdown.tsx`
  - `frontend/app/components/dashboard/NetFlowTrendCard.tsx`
  - `frontend/app/components/dashboard/FinancialOverview.tsx`
  - `frontend/app/components/dashboard/RangeSwitcher.tsx`
  - `frontend/app/components/dashboard/EmptyState.tsx`

**Note:** Keep `FinancialSnapshot.tsx` in case it's reusable. Keep Finlab chart components (`FinlabIncomeCard`, `FinlabExpenseCard`, etc.) — they could be reused in the Trends tab.

**Step 1: Delete dead files**

```bash
rm frontend/app/(main)/reports/reportChartLayout.ts
rm frontend/app/(main)/reports/reportChartLayout.test.ts
rm frontend/app/components/dashboard/DashboardHero.tsx
rm frontend/app/components/dashboard/FinanceChart.tsx
rm frontend/app/components/dashboard/IncomeExpenseBreakdown.tsx
rm frontend/app/components/dashboard/NetFlowTrendCard.tsx
rm frontend/app/components/dashboard/FinancialOverview.tsx
rm frontend/app/components/dashboard/RangeSwitcher.tsx
rm frontend/app/components/dashboard/EmptyState.tsx
```

**Step 2: Verify build**

```bash
cd frontend && npm run build
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove unused Reports chart layout and legacy dashboard components"
```

---

### Task 17: Run full test suite and fix failures

**Step 1: Run backend tests**

```bash
cd backend && npm run test
```

**Step 2: Run frontend tests**

```bash
cd frontend && npm run test
```

**Step 3: Run lint**

```bash
make lint
```

**Step 4: Fix any failures**

Update test files as needed:
- `frontend/app/components/dashboard/FinancialOverview.test.tsx` — delete (component removed)
- `backend/@tests/unit/modules/reports/reports.service.spec.ts` — update for new methods
- `backend/@tests/unit/modules/reports/reports.controller.spec.ts` — update for new endpoints

**Step 5: Commit**

```bash
git add -A
git commit -m "test: fix test suite after dashboard/reports restructure"
```

---

### Task 18: Run migration and integration verification

**Step 1: Apply DB migration**

```bash
cd backend && npm run migration:run
```

**Step 2: Start dev environment and verify manually**

```bash
make dev
```

Verify checklist:
- [ ] Dashboard at `/` shows 3 tabs: Overview, Trends, Data Health
- [ ] Quick Actions bar is visible on all tabs
- [ ] Overview tab shows KPIs, action items, cash flow, categories, recent activity
- [ ] Trends tab shows daily trend chart, expense categories pie, counterparty bar chart
- [ ] Data Health tab shows quality metrics with contextual links
- [ ] Reports at `/reports` shows Templates tab with 4 template cards
- [ ] Clicking P&L opens generator with date range + format selector
- [ ] Clicking Balance Sheet opens the existing BalanceSheet component
- [ ] History tab shows empty state (no reports generated yet)
- [ ] Generating a P&L report downloads a file
- [ ] Report appears in History after generation
- [ ] Transaction table accessible from Statements page

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: verify dashboard/reports restructure works end-to-end"
```

---

## Summary

| # | Task | Phase | Effort |
|---|------|-------|--------|
| 1 | Dashboard skeleton components (TrendsTab, DataHealthTab, QuickActionsBar) | 1 | Small |
| 2 | Rewire Dashboard page to 3 new tabs + Quick Actions bar | 1 | Medium |
| 3 | Backend: add data health metrics to Dashboard API | 1 | Medium |
| 4 | Backend: add /dashboard/trends endpoint | 1 | Medium |
| 5 | Implement TrendsTab with ECharts visualizations | 1 | Large |
| 6 | Implement DataHealthTab | 1 | Medium |
| 7 | i18n for new Dashboard content | 1 | Small |
| 8 | Report Builder component structure | 2 | Medium |
| 9 | Rewrite Reports page as Report Builder | 2 | Large |
| 10 | Backend: report generation + history endpoint + entity | 2 | Large |
| 11 | Backend: P&L template generator | 2 | Medium |
| 12 | Backend: Cash Flow + Expense by Category generators | 2 | Medium |
| 13 | Move Transaction table to Statements page | 3 | Small |
| 14 | i18n for Report Builder | 3 | Small |
| 15 | Update Reports tour | 3 | Small |
| 16 | Remove dead code | 3 | Small |
| 17 | Fix test suite | 3 | Medium |
| 18 | Migration + integration verification | 3 | Small |
