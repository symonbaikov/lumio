# Top Merchants Insight Tab — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Top merchants" tab in the Statements Insights section that shows spending analytics aggregated by merchant/counterparty name (where money goes), with the same filters and visualization patterns as Top Spenders.

**Architecture:** A new Next.js route `/statements/top-merchants` with a `TopMerchantsView` component. Data is fetched client-side from `GET /transactions` (paginated, exhaustive) plus Gmail receipts (same as Top Spenders). Transactions are grouped by `counterpartyName` and Gmail receipts by merchant label. The view renders KPI cards, charts (trend, source split, top merchants bar chart), and a leaderboard table. Reuses the existing filter infrastructure (TypeFilterDropdown, StatusFilterDropdown, DateFilterDropdown, FromFilterDropdown, FiltersDrawer).

**Tech Stack:** Next.js 14 App Router, React, ECharts (echarts-for-react), MUI icon (StorefrontIcon), existing filter components, apiClient, gmailReceiptsApi.

---

## Task 1: Add Side Panel Navigation Item

**Files:**
- Modify: `frontend/app/(main)/statements/components/StatementsSidePanel.tsx`

### Step 1: Update ActiveItem type

In `StatementsSidePanel.tsx`, add `'top-merchants'` to the `ActiveItem` type union (line 25-31):

```typescript
type ActiveItem =
  | 'submit'
  | 'approve'
  | 'pay'
  | 'spend-over-time'
  | 'top-spenders'
  | 'top-merchants'
  | 'top-categories';
```

### Step 2: Add StorefrontIcon import

Add at the top of the imports (after the lucide imports on line 18):

```typescript
import StorefrontIcon from '@mui/icons-material/Storefront';
```

### Step 3: Add state for merchant count

Add a new state variable for the badge count:

```typescript
const [topMerchantsCount, setTopMerchantsCount] = useState(0);
```

### Step 4: Compute merchant count for badge

Inside the `loadStageCounts` async function (around line 94, after computing `topBankSenders`), add a lightweight API call to get unique merchants count:

```typescript
try {
  const txResponse = await apiClient.get('/transactions', {
    params: { limit: 500, page: 1 },
  });
  const txItems = txResponse.data?.data || txResponse.data?.items || [];
  const uniqueMerchants = new Set(
    (Array.isArray(txItems) ? txItems : [])
      .map((tx: any) => (tx.counterpartyName || '').trim().toLowerCase())
      .filter(Boolean),
  );
  if (isMounted) {
    setTopMerchantsCount(uniqueMerchants.size);
  }
} catch {
  // Silent fail — badge will show 0
}
```

### Step 5: Add navigation item to Insights section

In the `sidePanelConfig` useMemo, inside the `insights` section items array (after the `top-spenders` item, before `top-categories`), add:

```typescript
{
  id: 'top-merchants',
  label: (t as any)?.sidePanel?.topMerchants?.value ?? 'Top merchants',
  icon: StorefrontIcon,
  badge: topMerchantsCount,
  href: '/statements/top-merchants',
  active: activeItem === 'top-merchants',
},
```

### Step 6: Update useMemo dependency array

Add `topMerchantsCount` to the dependency array of `sidePanelConfig` useMemo.

### Step 7: Commit

```
feat(statements): add Top merchants navigation item to side panel
```

---

## Task 2: Add i18n Content for Top Merchants

**Files:**
- Modify: `frontend/app/(main)/statements/page.content.ts`

### Step 1: Add sidePanel.topMerchants translation

In the `sidePanel` object (after `topSpenders` on line 184), add:

```typescript
topMerchants: t({
  ru: 'Топ мерчанты',
  en: 'Top merchants',
  kk: 'Топ сатушылар',
}),
```

### Step 2: Add topMerchants content section

After the `topSpenders` section (after line 228), add a new `topMerchants` section:

```typescript
topMerchants: {
  title: t({
    ru: 'Топ мерчанты',
    en: 'Top merchants',
    kk: 'Топ сатушылар',
  }),
  subtitle: t({
    ru: 'Аналитика расходов по мерчантам и контрагентам.',
    en: 'Spending analytics by merchants and counterparties.',
    kk: 'Сатушылар мен контрагенттер бойынша шығын аналитикасы.',
  }),
  searchPlaceholder: t({
    ru: 'Поиск по мерчанту или контрагенту',
    en: 'Search by merchant or counterparty',
    kk: 'Сатушы немесе контрагент бойынша іздеу',
  }),
  totalSpend: t({ ru: 'Общий расход', en: 'Total spend', kk: 'Жалпы шығын' }),
  statementsSpend: t({ ru: 'По выпискам', en: 'Statements', kk: 'Үзінділер' }),
  receiptsSpend: t({ ru: 'По чекам', en: 'Receipts', kk: 'Чектер' }),
  totalOperations: t({ ru: 'Операций', en: 'Operations', kk: 'Операциялар' }),
  topMerchantsList: t({
    ru: 'Топ мерчантов',
    en: 'Top merchants',
    kk: 'Топ сатушылар',
  }),
  sourceSplit: t({
    ru: 'Разбивка по источникам',
    en: 'Source split',
    kk: 'Дереккөз бойынша бөліну',
  }),
  spendTrend: t({ ru: 'Тренд расходов', en: 'Spending trend', kk: 'Шығын тренді' }),
  leaderboard: t({
    ru: 'Рейтинг мерчантов',
    en: 'Top merchants list',
    kk: 'Топ сатушылар тізімі',
  }),
  noData: t({
    ru: 'Нет данных для выбранных фильтров',
    en: 'No data for selected filters',
    kk: 'Таңдалған сүзгілер бойынша дерек жоқ',
  }),
  source: t({ ru: 'Источник', en: 'Source', kk: 'Дереккөз' }),
  merchant: t({ ru: 'Мерчант', en: 'Merchant', kk: 'Сатушы' }),
  amount: t({ ru: 'Сумма', en: 'Amount', kk: 'Сома' }),
  operations: t({ ru: 'Операции', en: 'Operations', kk: 'Операциялар' }),
  average: t({ ru: 'Средний чек', en: 'Average', kk: 'Орташа сома' }),
  lastOperation: t({ ru: 'Последняя операция', en: 'Last operation', kk: 'Соңғы операция' }),
  sourceStatement: t({ ru: 'Выписка', en: 'Statement', kk: 'Үзінді' }),
  sourceGmail: t({ ru: 'Чек', en: 'Receipt', kk: 'Чек' }),
},
```

### Step 3: Commit

```
feat(statements): add i18n content for Top merchants insight tab
```

---

## Task 3: Create the Route Page

**Files:**
- Create: `frontend/app/(main)/statements/top-merchants/page.tsx`

### Step 1: Create the page file

```typescript
'use client';

import StatementsSidePanel from '../components/StatementsSidePanel';
import TopMerchantsView from '../components/TopMerchantsView';

export default function StatementsTopMerchantsPage() {
  return (
    <>
      <StatementsSidePanel activeItem="top-merchants" />
      <TopMerchantsView />
    </>
  );
}
```

### Step 2: Commit

```
feat(statements): add /statements/top-merchants route page
```

---

## Task 4: Create TopMerchantsView Component

**Files:**
- Create: `frontend/app/(main)/statements/components/TopMerchantsView.tsx`

This is the main component (~1100 lines). It follows the exact same pattern as `TopSpendersView.tsx` (use it as the reference template) but with these key differences:

### Key Differences from TopSpendersView

| Aspect | TopSpendersView | TopMerchantsView |
|--------|----------------|------------------|
| **Data source** | `GET /statements` (paginated) | `GET /transactions` (paginated) |
| **Aggregation key** | `bankName` via `getBankDisplayName()` | `counterpartyName` directly |
| **Record type field** | `company` | `merchant` |
| **AggregateRow field** | `company` | `merchant` |
| **i18n key** | `topSpenders` | `topMerchants` |
| **localStorage key** | `lumio-top-spenders-filters` | `lumio-top-merchants-filters` |
| **Search fields** | company, sender, subject, bankName | merchant, sender, subject, paymentPurpose |
| **Table "Company" header** | `labels.company` | `labels.merchant` |
| **Import** | `resolveBankLogo` from `@bank-logos` | Not needed |

### Step 1: Create the component

Copy the structure from `TopSpendersView.tsx` and apply these changes:

**1. Types:**

Replace `Statement` type with `Transaction`:
```typescript
type Transaction = {
  id: string;
  counterpartyName: string;
  transactionDate: string;
  amount?: number | null;
  debit?: number | null;
  credit?: number | null;
  currency?: string;
  transactionType?: 'income' | 'expense';
  paymentPurpose?: string;
  statementId?: string | null;
  category?: { id: string; name: string } | null;
};
```

Keep `GmailReceipt` type the same.

Replace `TopSpenderRecord` with `MerchantRecord`:
```typescript
type MerchantRecord = StatementFilterItem & {
  sourceType: 'statement' | 'gmail';
  merchant: string;
  amount: number;
  currencyValue: string;
  dateValue: string;
};
```

Replace `AggregateRow.company` with `AggregateRow.merchant`.

**2. Remove unused imports:**
- Remove `resolveBankLogo` from `@bank-logos`
- Remove `getBankDisplayName` helper function

**3. Data fetching (useEffect):**

Replace the statements fetch with transactions fetch:
```typescript
const allTransactions: Transaction[] = [];
const txPageSize = 500;
let txPage = 1;
let txTotal = Number.POSITIVE_INFINITY;

while (allTransactions.length < txTotal) {
  const response = await apiClient.get('/transactions', {
    params: { page: txPage, limit: txPageSize },
  });
  const items = response.data?.data || response.data?.items || response.data || [];
  const batch = Array.isArray(items) ? items : [];
  allTransactions.push(...batch);
  txTotal = Number(response.data?.total ?? allTransactions.length);
  if (batch.length < txPageSize) break;
  txPage += 1;
}
```

Keep Gmail receipts fetch the same.

State: `const [transactions, setTransactions] = useState<Transaction[]>([]);`

**4. Record mapping (allRecords useMemo):**

Map transactions to MerchantRecord:
```typescript
const mappedTransactions: MerchantRecord[] = transactions.map(tx => {
  const merchant = (tx.counterpartyName || '').trim() || 'Unknown';
  const amount = Math.abs(tx.debit || 0) || Math.abs(tx.credit || 0) || Math.abs(tx.amount || 0);
  const dateValue = tx.transactionDate || '';
  const currency = tx.currency || 'KZT';

  return {
    id: tx.id,
    source: 'statement',
    fileName: merchant,
    subject: null,
    sender: null,
    status: null,
    fileType: null,
    createdAt: dateValue,
    statementDateFrom: dateValue,
    statementDateTo: null,
    bankName: null,
    totalDebit: amount,
    totalCredit: null,
    currency,
    exported: null,
    paid: null,
    parsingDetails: null,
    user: null,
    receivedAt: null,
    parsedData: { vendor: merchant, date: dateValue },
    merchant,
    amount,
    currencyValue: currency,
    dateValue,
    sourceType: 'statement',
  };
});
```

Gmail receipt mapping stays similar, just use `merchant` field instead of `company`.

**5. Aggregation (aggregatedRows useMemo):**

Group by `sourceType:merchant` (lowercase):
```typescript
const key = `${record.sourceType}:${(record.merchant || '').trim().toLowerCase() || 'unknown'}`;
```

Use `merchant` in the AggregateRow instead of `company`.

**6. Labels:**

Replace all `(t as any)?.topSpenders?.` with `(t as any)?.topMerchants?.`:
```typescript
title: resolveLabel((t as any)?.topMerchants?.title, 'Top merchants'),
subtitle: resolveLabel((t as any)?.topMerchants?.subtitle, 'Spending analytics by merchants and counterparties.'),
searchPlaceholder: resolveLabel((t as any)?.topMerchants?.searchPlaceholder, 'Search by merchant or counterparty'),
// ... etc
merchant: resolveLabel((t as any)?.topMerchants?.merchant, 'Merchant'),
```

**7. localStorage key:**

```typescript
const STORAGE_KEY = 'lumio-top-merchants-filters';
```

**8. Search filter:**

```typescript
return filtered.filter(record => {
  return (
    record.merchant.toLowerCase().includes(query) ||
    (record.sender || '').toLowerCase().includes(query) ||
    (record.subject || '').toLowerCase().includes(query)
  );
});
```

**9. Charts:**

- `topCompaniesChart` → `topMerchantsChart`: use `item.merchant` instead of `item.company`
- Rest of chart logic stays the same

**10. Table:**

- Header: `{labels.merchant}` instead of `{labels.company}`
- Row: `{row.merchant}` instead of `{row.company}`

**11. fromOptions:**

For merchant view, the "From" filter shows unique merchants and categories:
```typescript
const fromOptions = useMemo(() => {
  const seen = new Map<string, { id: string; label: string; description?: string | null }>();

  allRecords.forEach(record => {
    const merchantKey = `merchant:${record.merchant.toLowerCase()}`;
    if (!seen.has(merchantKey)) {
      seen.set(merchantKey, {
        id: merchantKey,
        label: record.merchant,
        description: null,
      });
    }
  });

  return Array.from(seen.values());
}, [allRecords]);
```

### Step 2: Verify it compiles and renders

Run: `cd frontend && npm run dev`
Navigate to `/statements/top-merchants` and verify the page loads with data.

### Step 3: Commit

```
feat(statements): implement TopMerchantsView with transaction-based merchant analytics
```

---

## Task 5: Run Lint, Tests & Build

### Step 1: Run Biome lint

```bash
make lint
```

Fix any linting issues.

### Step 2: Run frontend tests

```bash
make test-frontend
```

Fix any test failures.

### Step 3: Run build

```bash
cd frontend && npm run build
```

Ensure no build errors.

### Step 4: Commit any fixes

```
fix(statements): resolve lint and type issues in top merchants feature
```

---

## Summary of Files

| Action | File |
|--------|------|
| Modify | `frontend/app/(main)/statements/components/StatementsSidePanel.tsx` |
| Modify | `frontend/app/(main)/statements/page.content.ts` |
| Create | `frontend/app/(main)/statements/top-merchants/page.tsx` |
| Create | `frontend/app/(main)/statements/components/TopMerchantsView.tsx` |

**No backend changes required.** The existing `GET /transactions` endpoint provides all necessary data (counterpartyName, amount, debit, credit, transactionDate, currency). The `GET /integrations/gmail/receipts` endpoint is already used by Top Spenders and will be reused.
