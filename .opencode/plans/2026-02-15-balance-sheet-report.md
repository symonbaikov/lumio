# Balance Sheet Report Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Balance Sheet (Баланс) tab to the /reports page with a two-column Assets/Liabilities view, a new Chart of Accounts system, manual input fields, auto-computed "Cash" section from wallets+statements, date filtering, and Excel/PDF export.

**Architecture:** New `BalanceAccount` entity with hierarchical account types (asset/liability/equity + sub-types). New `BalanceSnapshot` entity stores point-in-time manual values. Backend endpoint aggregates manual snapshot values with auto-computed wallet/statement balances. Frontend adds a 4th tab "Баланс" to the reports page, rendering the two-column balance sheet with inline editable fields.

**Tech Stack:** NestJS + TypeORM (backend), Next.js 14 + Tailwind CSS + ECharts (frontend), PostgreSQL, i18n via next-intlayer (ru/en/kk)

---

## Context & Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Data source | New Chart of Accounts (BalanceAccount entity) | Full accounting structure needed per screenshot |
| Page placement | New tab on /reports page | Consistent with existing tabs pattern |
| Data input | Manual input + auto-computed "Cash" section | Per screenshot: input fields for fixed assets, equity; auto for cash |
| Auto "Cash" source | Wallets (initialBalance + transactions) + Statements (balanceEnd) | Most accurate combination |
| Date filter | Yes, "На данный момент" + date picker | Per screenshot reference |
| Export | Excel + PDF | Per user request |

## Data Model

### BalanceAccount (Chart of Accounts)

```
balance_accounts
  id (uuid PK)
  workspace_id (uuid FK -> workspaces)
  parent_id (uuid FK -> balance_accounts, nullable)
  name (varchar) -- e.g. "Основные средства"
  name_en (varchar, nullable) -- e.g. "Fixed assets"
  name_kk (varchar, nullable) -- e.g. "Негізгі құралдар"
  account_type (enum: 'asset' | 'liability' | 'equity')
  sub_type (enum: 'non_current_asset' | 'current_asset' | 'cash' | 'equity' | 'borrowed_capital')
  is_editable (boolean, default true) -- false for auto-computed accounts
  is_auto_computed (boolean, default false) -- true for "Деньги" section
  auto_source (enum: 'wallets' | 'statements' | 'wallets_and_statements', nullable)
  position (int) -- sort order within parent
  is_system (boolean, default true) -- system-seeded vs user-created
  is_expandable (boolean, default false) -- has dropdown arrow like on screenshot
  created_at (timestamp)
  updated_at (timestamp)
```

### BalanceSnapshot (Point-in-time values)

```
balance_snapshots
  id (uuid PK)
  workspace_id (uuid FK -> workspaces)
  account_id (uuid FK -> balance_accounts)
  snapshot_date (date) -- the date this value is for
  amount (decimal 15,2)
  currency (varchar, default 'KZT')
  created_by (uuid FK -> users)
  created_at (timestamp)
  updated_at (timestamp)
  UNIQUE(workspace_id, account_id, snapshot_date)
```

### Default Chart of Accounts (seeded per workspace)

**Left column -- Assets:**

| # | Name (ru) | Name (en) | sub_type | is_editable | is_auto | Notes |
|---|---|---|---|---|---|---|
| **I. Внеоборотные активы** | Non-current assets | `non_current_asset` | false | false | Section header |
| 1. Основные средства | Fixed assets | `non_current_asset` | true | false | Manual input |
| 2. Нематериальные активы | Intangible assets | `non_current_asset` | true | false | Manual input |
| 3. Инвестиции | Investments | `non_current_asset` | false | false | Computed from children |
| **II. Оборотные активы** | Current assets | `current_asset` | false | false | Section header |
| 1. Запасы | Inventory | `current_asset` | true | false | Manual input |
| 2. Дебиторская задолженность | Accounts receivable | `current_asset` | false | false | Expandable |
| **III. Деньги** | Cash | `cash` | false | true | **Auto-computed** from wallets+statements |

**Right column -- Liabilities + Equity:**

| # | Name (ru) | Name (en) | sub_type | is_editable | is_auto | Notes |
|---|---|---|---|---|---|---|
| **I. Собственный капитал** | Equity | `equity` | false | false | Section header |
| 1. Уставный капитал | Authorized capital | `equity` | true | false | Manual input |
| 2. Дополнительный капитал | Additional capital | `equity` | true | false | Manual input |
| 3. Нераспределённая прибыль | Retained earnings | `equity` | false | true | Auto = total income - total expense |
| **II. Ссудный капитал** | Borrowed capital | `borrowed_capital` | false | false | Expandable |

---

## Task Breakdown

### Task 1: Create BalanceAccount Entity

**Files:**
- Create: `backend/src/entities/balance-account.entity.ts`

**Step 1: Create the entity file**

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';

export enum BalanceAccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
}

export enum BalanceAccountSubType {
  NON_CURRENT_ASSET = 'non_current_asset',
  CURRENT_ASSET = 'current_asset',
  CASH = 'cash',
  EQUITY = 'equity',
  BORROWED_CAPITAL = 'borrowed_capital',
}

export enum BalanceAutoSource {
  WALLETS = 'wallets',
  STATEMENTS = 'statements',
  WALLETS_AND_STATEMENTS = 'wallets_and_statements',
}

@Entity('balance_accounts')
export class BalanceAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @ManyToOne(() => BalanceAccount, account => account.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: BalanceAccount | null;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string | null;

  @OneToMany(() => BalanceAccount, account => account.parent)
  children: BalanceAccount[];

  @Column()
  name: string;

  @Column({ name: 'name_en', nullable: true })
  nameEn: string | null;

  @Column({ name: 'name_kk', nullable: true })
  nameKk: string | null;

  @Column({ name: 'account_type', type: 'enum', enum: BalanceAccountType })
  accountType: BalanceAccountType;

  @Column({ name: 'sub_type', type: 'enum', enum: BalanceAccountSubType })
  subType: BalanceAccountSubType;

  @Column({ name: 'is_editable', default: true })
  isEditable: boolean;

  @Column({ name: 'is_auto_computed', default: false })
  isAutoComputed: boolean;

  @Column({ name: 'auto_source', type: 'enum', enum: BalanceAutoSource, nullable: true })
  autoSource: BalanceAutoSource | null;

  @Column({ default: 0 })
  position: number;

  @Column({ name: 'is_system', default: true })
  isSystem: boolean;

  @Column({ name: 'is_expandable', default: false })
  isExpandable: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**Step 2: Verify with lint**

Run: `cd backend && npx biome check src/entities/balance-account.entity.ts`
Expected: No errors

---

### Task 2: Create BalanceSnapshot Entity

**Files:**
- Create: `backend/src/entities/balance-snapshot.entity.ts`

**Step 1: Create the entity file**

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { BalanceAccount } from './balance-account.entity';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';

@Entity('balance_snapshots')
@Unique(['workspaceId', 'accountId', 'snapshotDate'])
export class BalanceSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @ManyToOne(() => BalanceAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: BalanceAccount;

  @Column({ name: 'account_id' })
  accountId: string;

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount: number;

  @Column({ default: 'KZT' })
  currency: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @Column({ name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**Step 2: Verify with lint**

Run: `cd backend && npx biome check src/entities/balance-snapshot.entity.ts`

---

### Task 3: Create Database Migration

**Files:**
- Create: `backend/src/migrations/1763000000000-AddBalanceSheetEntities.ts`

**Step 1: Create migration**

The migration should:
1. Create `balance_account_type_enum` ('asset', 'liability', 'equity')
2. Create `balance_account_sub_type_enum` ('non_current_asset', 'current_asset', 'cash', 'equity', 'borrowed_capital')
3. Create `balance_auto_source_enum` ('wallets', 'statements', 'wallets_and_statements')
4. Create `balance_accounts` table with all columns and FK to `workspaces` and self-referential `parent_id`
5. Create `balance_snapshots` table with unique constraint on (workspace_id, account_id, snapshot_date)
6. Seed default chart of accounts for all existing workspaces (using a function that inserts the default account tree)

**Step 2: Run migration**

Run: `cd backend && npm run migration:run`
Expected: Migration executes successfully

**Step 3: Verify tables exist**

Run: `cd backend && npm run typeorm -- query "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'balance%'"`

---

### Task 4: Create Balance Module (Backend)

**Files:**
- Create: `backend/src/modules/balance/balance.module.ts`
- Create: `backend/src/modules/balance/balance.controller.ts`
- Create: `backend/src/modules/balance/balance.service.ts`
- Create: `backend/src/modules/balance/dto/update-balance-snapshot.dto.ts`
- Create: `backend/src/modules/balance/dto/balance-query.dto.ts`
- Modify: `backend/src/app.module.ts` -- register BalanceModule

**Step 1: Create DTOs**

`balance-query.dto.ts`:
```typescript
import { IsDateString, IsOptional } from 'class-validator';

export class BalanceQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string; // defaults to today
}
```

`update-balance-snapshot.dto.ts`:
```typescript
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateBalanceSnapshotDto {
  @IsUUID()
  accountId: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsDateString()
  date?: string; // defaults to today

  @IsOptional()
  @IsString()
  currency?: string;
}
```

**Step 2: Create BalanceService**

Key methods:
- `getBalanceSheet(workspaceId: string, date?: string)` -- main method:
  1. Fetch all `BalanceAccount` records for workspace (with children, ordered by position)
  2. For each account: if `is_auto_computed` and `auto_source` includes 'wallets', compute wallet balance up to `date`
  3. For each account: if `is_auto_computed` and `auto_source` includes 'statements', get latest statement `balanceEnd` before `date`
  4. For manually-editable accounts, get latest `BalanceSnapshot` on or before `date`
  5. Aggregate parent section totals from children
  6. Return structured response: `{ assets: { total, sections[] }, liabilities: { total, sections[] }, date }`

- `getAutoComputedCashBalance(workspaceId: string, date: string)`:
  1. Query all active wallets for the workspace (via user's workspace membership)
  2. For each wallet: `initialBalance + SUM(credit) - SUM(debit)` where `transactionDate <= date`
  3. Also get latest `balanceEnd` from completed statements where `statementDateTo <= date`
  4. Return the higher-confidence value (wallet-computed preferred if transactions exist, statement fallback)

- `getRetainedEarnings(workspaceId: string, date: string)`:
  1. Query all transactions for workspace where `transactionDate <= date`
  2. Sum all `credit` (income) minus all `debit` (expense)
  3. Return the net value

- `updateSnapshot(userId: string, workspaceId: string, dto: UpdateBalanceSnapshotDto)`:
  1. Verify account exists and `isEditable = true`
  2. Upsert `BalanceSnapshot` (unique on workspace+account+date)
  3. Audit log the change

- `getAccountsTree(workspaceId: string)` -- return the chart of accounts tree

- `seedDefaultAccounts(workspaceId: string)` -- create default chart of accounts for a new workspace

**Step 3: Create BalanceController**

Endpoints:
- `GET /balance/sheet?date=YYYY-MM-DD` -- get full balance sheet (Permission: REPORT_VIEW)
- `PUT /balance/snapshot` -- update a manual value (Permission: REPORT_VIEW)
- `GET /balance/accounts` -- get chart of accounts tree (Permission: REPORT_VIEW)
- `POST /balance/export?date=YYYY-MM-DD&format=excel|pdf` -- export balance sheet (Permission: REPORT_EXPORT)

**Step 4: Create BalanceModule**

Register entities: `BalanceAccount`, `BalanceSnapshot`, `Wallet`, `Transaction`, `Statement`, `User`
Import: `AuditModule`

**Step 5: Register in AppModule**

Modify: `backend/src/app.module.ts` -- add `BalanceModule` to imports

**Step 6: Verify compilation**

Run: `cd backend && npx tsc --noEmit`

---

### Task 5: Seed Default Accounts on Workspace Creation

**Files:**
- Modify: `backend/src/modules/workspaces/workspaces.service.ts` -- call `balanceService.seedDefaultAccounts(workspaceId)` after workspace creation

**Step 1: Inject BalanceService into WorkspacesModule**

Import `BalanceModule` (or just the `BalanceService`) into `WorkspacesModule`. Then in `WorkspacesService`, after creating a new workspace, call `seedDefaultAccounts`.

**Step 2: The default tree**

```
Assets (asset):
  I. Внеоборотные активы (non_current_asset) [section header, position=0]
    1. Основные средства [editable, position=0]
    2. Нематериальные активы [editable, position=1]
    3. Инвестиции [section header, expandable, position=2]
  II. Оборотные активы (current_asset) [section header, position=1]
    1. Запасы [editable, position=0]
    2. Дебиторская задолженность [expandable, position=1]
  III. Деньги (cash) [expandable, auto_computed, auto_source=wallets_and_statements, position=2]

Liabilities+Equity:
  I. Собственный капитал (equity) [section header, position=0]
    1. Уставный капитал [editable, position=0]
    2. Дополнительный капитал [editable, position=1]
    3. Нераспределённая прибыль [auto_computed (income - expense), position=2]
  II. Ссудный капитал (borrowed_capital) [expandable, position=1]
```

**Step 3: Verify seeding works**

Run backend in dev mode, create a workspace, check that balance_accounts rows are populated.

---

### Task 6: Balance Sheet Export (Excel + PDF)

**Files:**
- Modify: `backend/src/modules/balance/balance.service.ts` -- add `exportBalanceSheet(workspaceId, date, format)` method
- Modify: `backend/src/modules/balance/balance.controller.ts` -- add export endpoint

**Step 1: Implement Excel export**

Use the existing `xlsx` library (already in backend deps from reports export). Create a workbook with a single sheet showing the two-column balance layout:
- Column A-B: Assets (account name, amount)
- Column D-E: Liabilities (account name, amount)
- Section headers in bold
- Total rows highlighted

**Step 2: Implement PDF export**

Check if `pdfkit` is already a dependency. If not, `npm install pdfkit @types/pdfkit`. Create a two-column layout matching the screenshot format.

Alternative: use `xlsx` + convert via client-side print-to-PDF. Simpler for v1.

**Step 3: Verify export**

Run: `curl -X POST localhost:3001/api/balance/export?date=2026-02-15&format=excel -H "Authorization: Bearer ..." -o balance.xlsx`

---

### Task 7: Add i18n Content for Balance Tab

**Files:**
- Modify: `frontend/app/(main)/reports/page.content.ts` -- add all balance-related translations

**Step 1: Add translations**

Add to the `content.content.labels` section:

```typescript
tabBalance: t({ ru: 'Баланс', en: 'Balance', kk: 'Баланс' }),
balanceTitle: t({ ru: 'Баланс', en: 'Balance Sheet', kk: 'Баланс' }),
assets: t({ ru: 'Активы', en: 'Assets', kk: 'Активтер' }),
liabilities: t({ ru: 'Пассивы', en: 'Liabilities', kk: 'Пассивтер' }),
nonCurrentAssets: t({ ru: 'Внеоборотные активы', en: 'Non-current assets', kk: 'Айналымнан тыс активтер' }),
currentAssets: t({ ru: 'Оборотные активы', en: 'Current assets', kk: 'Айналым активтері' }),
cash: t({ ru: 'Деньги', en: 'Cash', kk: 'Ақша' }),
equity: t({ ru: 'Собственный капитал', en: 'Equity', kk: 'Меншікті капитал' }),
borrowedCapital: t({ ru: 'Ссудный капитал', en: 'Borrowed capital', kk: 'Қарыз капиталы' }),
fixedAssets: t({ ru: 'Основные средства', en: 'Fixed assets', kk: 'Негізгі құралдар' }),
intangibleAssets: t({ ru: 'Нематериальные активы', en: 'Intangible assets', kk: 'Материалдық емес активтер' }),
investments: t({ ru: 'Инвестиции', en: 'Investments', kk: 'Инвестициялар' }),
inventory: t({ ru: 'Запасы', en: 'Inventory', kk: 'Қорлар' }),
accountsReceivable: t({ ru: 'Дебиторская задолженность', en: 'Accounts receivable', kk: 'Дебиторлық берешек' }),
authorizedCapital: t({ ru: 'Уставный капитал', en: 'Authorized capital', kk: 'Жарғылық капитал' }),
additionalCapital: t({ ru: 'Дополнительный капитал', en: 'Additional capital', kk: 'Қосымша капитал' }),
retainedEarnings: t({
  ru: 'Нераспределённая прибыль (непокрытый убыток)',
  en: 'Retained earnings (uncovered loss)',
  kk: 'Бөлінбеген пайда (жабылмаған залал)',
}),
asOfNow: t({ ru: 'На данный момент', en: 'As of now', kk: 'Қазіргі уақытта' }),
asOfDate: t({ ru: 'На дату', en: 'As of date', kk: 'Күніне' }),
savingBalance: t({ ru: 'Сохранение...', en: 'Saving...', kk: 'Сақталуда...' }),
balanceSaved: t({ ru: 'Баланс сохранён', en: 'Balance saved', kk: 'Баланс сақталды' }),
exportBalance: t({ ru: 'Экспорт баланса', en: 'Export balance', kk: 'Балансты экспорттау' }),
exportExcel: t({ ru: 'Excel', en: 'Excel', kk: 'Excel' }),
exportPdf: t({ ru: 'PDF', en: 'PDF', kk: 'PDF' }),
```

---

### Task 8: Create BalanceSheet Component

**Files:**
- Create: `frontend/app/(main)/reports/components/BalanceSheet.tsx`

**Step 1: Create the BalanceSheet component**

This is the main component rendered in the "Баланс" tab. Structure:

```
BalanceSheet
  Header row: date filter dropdown ("На данный момент" / date picker) + export button (Download icon)
  Two-column layout (grid md:grid-cols-2 gap-8)
    Left column: "Активы {total} ₸"
      Section I: Внеоборотные активы {subtotal} ₸
        Row: Основные средства [input field] ₸
        Row: Нематериальные активы [input field] ₸
        Row: Инвестиции {value} ₸
      Section II: Оборотные активы {subtotal} ₸
        Row: Запасы [input field] ₸
        Row: Дебиторская задолженность (arrow) {value} ₸
      Section III: Деньги (arrow) {auto-computed value} ₸
    Right column: "Пассивы {total} ₸"
      Section I: Собственный капитал {subtotal} ₸
        Row: Уставный капитал [input field] ₸
        Row: Дополнительный капитал [input field] ₸
        Row: Нераспределённая прибыль (непокрытый убыток) {auto} ₸
      Section II: Ссудный капитал (arrow) {value} ₸
```

Key UI behaviors:
- Input fields: light gray background (`bg-gray-50`), number input, right-aligned value, "₸" suffix
- On blur / Enter: auto-save via `PUT /balance/snapshot` with debounce
- Debounced saving with visual feedback (brief checkmark or "Saved" indicator)
- Expandable sections (ChevronDown icon) toggle visibility of sub-accounts
- Section headers: bold text with Roman numeral prefix ("I.", "II.", "III.")
- Section total shown right-aligned
- Auto-computed values shown as plain text (not input), slightly different styling
- Date filter: dropdown with "На данный момент" default + date picker option (use native `<input type="date">` or custom picker)
- Export button: Download icon, opens dropdown with "Excel" and "PDF" options
- Currency formatting: use `Intl.NumberFormat` with KZT, showing "₸" symbol

**Step 2: Styling per Finflow guidelines**

- White background with subtle border (`border-gray-200 rounded-lg`)
- Professional LinkedIn aesthetic per styling-guide skill
- Section dividers: thin `border-b border-gray-100` between rows
- Section headers: `font-semibold text-sm`
- Row labels: `text-sm text-gray-700`
- Row values: `text-sm font-medium`
- Input fields: `bg-gray-50 border border-gray-200 rounded px-2 py-1 text-right text-sm w-20`
- Responsive: stack columns on mobile (`grid-cols-1 md:grid-cols-2`)

---

### Task 9: Integrate Balance Tab into Reports Page

**Files:**
- Modify: `frontend/app/(main)/reports/page.tsx` -- add 4th tab and render BalanceSheet component

**Step 1: Add 'balance' to tab state**

Change tab type from `'sheets' | 'statements' | 'local'` to `'sheets' | 'statements' | 'local' | 'balance'`

At line 160: `const [tab, setTab] = useState<'sheets' | 'statements' | 'local' | 'balance'>('sheets');`

**Step 2: Add tab button**

After the "Statement parsing" tab button (around line 608-618), add a new button for "Баланс":

```tsx
<button
  onClick={() => setTab('balance')}
  className={`border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
    tab === 'balance'
      ? 'border-primary text-primary'
      : 'border-transparent text-gray-500 hover:text-primary'
  }`}
  data-tour-id="reports-tab-balance"
>
  {t.labels.tabBalance}
</button>
```

**Step 3: Add tab content**

After the statements tab content block, add:

```tsx
{tab === 'balance' && <BalanceSheet />}
```

Import the BalanceSheet component at the top of the file.

**Step 4: Verify**

Run: `cd frontend && npm run dev`
Navigate to /reports and verify the 4th tab appears and renders the balance sheet.

---

### Task 10: Add Balance Sheet Export (Frontend)

**Files:**
- Modify: `frontend/app/(main)/reports/components/BalanceSheet.tsx` -- add export button logic

**Step 1: Implement export button**

- Download icon (from Lucide: `Download`)
- On click: show a small dropdown with "Excel" and "PDF" options
- Call `POST /balance/export?date=...&format=excel` (or pdf) via `apiClient`
- Use `responseType: 'blob'` for the request
- Trigger browser download with `URL.createObjectURL` + hidden anchor element
- Show loading state during export

---

### Task 11: Add Unit Tests (Backend)

**Files:**
- Create: `backend/@tests/unit/modules/balance/balance.service.spec.ts`

**Step 1: Write tests for BalanceService**

Test cases:
1. `getBalanceSheet` -- returns correct tree structure with computed totals
2. `getAutoComputedCashBalance` -- correctly sums wallet initialBalance + transaction credits - debits
3. `getRetainedEarnings` -- correctly computes income - expense
4. `updateSnapshot` -- creates/updates snapshot for editable accounts
5. `updateSnapshot` -- rejects update for auto-computed (non-editable) accounts
6. `seedDefaultAccounts` -- creates full default chart of accounts with correct hierarchy

**Step 2: Run tests**

Run: `cd backend && npx jest --testPathPattern="balance" --verbose`
Expected: All tests pass

---

### Task 12: Add E2E Tests (Backend)

**Files:**
- Create: `backend/@tests/e2e/balance.e2e-spec.ts`

**Step 1: Write E2E tests**

Test cases:
1. `GET /balance/sheet` -- returns 200 with correct structure (assets, liabilities, date)
2. `GET /balance/sheet?date=2026-01-01` -- returns balance as of past date
3. `PUT /balance/snapshot` -- updates value, subsequent GET reflects it
4. `PUT /balance/snapshot` -- rejects update for auto-computed account (400)
5. `POST /balance/export?format=excel` -- returns .xlsx file with correct content-type
6. `GET /balance/accounts` -- returns chart of accounts tree

**Step 2: Run E2E tests**

Run: `cd backend && npx jest --testPathPattern="balance.e2e" --verbose`

---

### Task 13: Lint, Format, and Final Verification

**Step 1: Run linter**

Run: `make lint`
Expected: No errors

**Step 2: Run formatter**

Run: `make format`

**Step 3: Run all tests**

Run: `make test`
Expected: All pass

**Step 4: Manual smoke test**

1. Navigate to /reports
2. Click "Баланс" tab
3. Verify two-column layout renders with correct section structure
4. Enter values in input fields (e.g., Основные средства = 50000)
5. Tab out -- verify value saves (no full page reload)
6. Verify section subtotals and column totals update
7. Verify "Деньги" section shows auto-computed value from wallets
8. Verify "Нераспределённая прибыль" shows income - expense
9. Change date filter -- verify values change
10. Click export -- verify Excel downloads correctly
11. Verify dark mode works
12. Verify mobile layout (columns stack)

---

## Commit Strategy

| After Task | Commit Message |
|---|---|
| Tasks 1-2 | `feat(balance): add BalanceAccount and BalanceSnapshot entities` |
| Task 3 | `feat(balance): add database migration for balance sheet tables` |
| Tasks 4-5 | `feat(balance): add balance module with sheet, snapshot, and export endpoints` |
| Task 6 | `feat(balance): add Excel and PDF export for balance sheet` |
| Tasks 7-9 | `feat(balance): add Balance tab to reports page with two-column layout` |
| Task 10 | `feat(balance): add frontend export functionality` |
| Tasks 11-12 | `test(balance): add unit and e2e tests for balance module` |
| Task 13 | `chore: lint and format balance sheet feature` |

---

## Risk & Open Questions

1. **Wallet balance accuracy**: Wallets may not have all transactions linked (some transactions lack `walletId`). The cash calculation should handle this gracefully -- show available data, note if data is partial.
2. **Multi-currency**: Current implementation assumes KZT. If wallets have different currencies, we need conversion logic or per-currency breakdowns. **For v1: show only KZT, sum up same-currency wallets.**
3. **Historical snapshots**: When viewing a past date, manual values use the latest snapshot on or before that date. If no snapshot exists, show 0.
4. **Retained earnings formula**: `income - expense` computed from all workspace transactions up to the selected date. May be expensive for large datasets -- consider caching or materialized aggregation.
5. **Page size**: Reports page is already 1270 lines. The balance sheet is extracted into `components/BalanceSheet.tsx` to avoid bloating further.
6. **Workspace seeding timing**: Existing workspaces need balance accounts seeded via migration. New workspaces get seeded on creation.
