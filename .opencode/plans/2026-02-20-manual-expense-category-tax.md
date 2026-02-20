# Manual Expense: Category & Tax Rate Fields Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Category (required) and Tax Rate fields to the manual expense creation form, including a full backend tax-rate presets system and layered drawer UIs for selection.

**Architecture:** Create a new `TaxRate` entity + CRUD API in the backend. Extend `CreateManualExpenseDto` and `createManualExpense()` to accept `categoryId` and `taxRateId`. On the frontend, add Category and Tax fields to the `CreateExpenseDrawer` details step, reusing the existing `StatementCategoryDrawer` pattern for both pickers. Category and Tax drawers open as overlays at the same width (`lg`) as the parent drawer.

**Tech Stack:** NestJS (TypeORM, class-validator), Next.js 14, Tailwind CSS, DrawerShell component, lucide-react icons.

---

## Phase 1: Backend -- Tax Rate Entity & CRUD

### Task 1: Create TaxRate Entity

**Files:**
- Create: `backend/src/entities/tax-rate.entity.ts`
- Modify: `backend/src/entities/index.ts` (add export)

**Step 1: Create the entity file**

```typescript
// backend/src/entities/tax-rate.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';

@Entity('tax_rates')
export class TaxRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace | null;

  @Column({ name: 'workspace_id', nullable: true })
  workspaceId: string | null;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  rate: number;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**Step 2: Add export to `backend/src/entities/index.ts`**

Add this line to the barrel export file:
```typescript
export { TaxRate } from './tax-rate.entity';
```

**Step 3: Commit**
```
feat(entities): add TaxRate entity for tax rate presets
```

---

### Task 2: Create Database Migration for tax_rates Table

**Files:**
- Create: `backend/src/migrations/<timestamp>-CreateTaxRatesTable.ts`

**Step 1: Create the migration**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaxRatesTable<TIMESTAMP> implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tax_rates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid,
        "name" varchar NOT NULL,
        "rate" numeric(5,2) NOT NULL DEFAULT 0,
        "is_default" boolean NOT NULL DEFAULT false,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tax_rates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tax_rates_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tax_rates"`);
  }
}
```

**Step 2: Run the migration**
```bash
cd backend && npm run migration:run
```

**Step 3: Commit**
```
feat(migrations): add tax_rates table
```

---

### Task 3: Create TaxRate Module with CRUD

**Files:**
- Create: `backend/src/modules/tax-rates/tax-rates.module.ts`
- Create: `backend/src/modules/tax-rates/tax-rates.controller.ts`
- Create: `backend/src/modules/tax-rates/tax-rates.service.ts`
- Create: `backend/src/modules/tax-rates/dto/create-tax-rate.dto.ts`
- Create: `backend/src/modules/tax-rates/dto/update-tax-rate.dto.ts`
- Modify: `backend/src/app.module.ts` (register TaxRatesModule)

**Step 1: Create DTOs**

`create-tax-rate.dto.ts`:
```typescript
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateTaxRateDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
```

`update-tax-rate.dto.ts`:
```typescript
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class UpdateTaxRateDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  rate?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
```

**Step 2: Create the service**

`tax-rates.service.ts` -- provides:
- `findAll(workspaceId)`: returns all tax rates for the workspace, ordered by `isDefault DESC, name ASC`
- `findOne(id, workspaceId)`: returns a single tax rate
- `create(workspaceId, dto)`: creates a new tax rate; if `isDefault`, unset any previous default
- `update(id, workspaceId, dto)`: updates a tax rate; if setting `isDefault`, unset any previous default
- `remove(id, workspaceId)`: deletes a tax rate
- `createDefaultTaxRates(workspaceId)`: seeds "Tax exempt (0%)" as the default rate

Follow the pattern in `backend/src/modules/categories/categories.service.ts` for structure.

**Step 3: Create the controller**

`tax-rates.controller.ts` at `@Controller('tax-rates')`:
- `GET /tax-rates` -- list all for workspace
- `GET /tax-rates/:id` -- get one
- `POST /tax-rates` -- create
- `PUT /tax-rates/:id` -- update
- `DELETE /tax-rates/:id` -- delete

Use same guards as categories controller: `JwtAuthGuard`, `WorkspaceContextGuard`, `PermissionsGuard`.

**Step 4: Create the module and register in AppModule**

`tax-rates.module.ts`:
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([TaxRate, User, WorkspaceMember])],
  controllers: [TaxRatesController],
  providers: [TaxRatesService],
  exports: [TaxRatesService],
})
export class TaxRatesModule {}
```

Register `TaxRatesModule` in `app.module.ts` imports array.

**Step 5: Commit**
```
feat(tax-rates): add TaxRate CRUD module with controller, service, and DTOs
```

---

### Task 4: Seed Default Tax Rate on Workspace Creation

**Files:**
- Modify: the workspace creation flow (wherever system categories are seeded -- look for `createSystemCategories` calls)

**Step 1: Find where `createSystemCategories` is called** (workspace creation/setup flow)

**Step 2: Add `taxRatesService.createDefaultTaxRates(workspaceId)` alongside it**

The default seed should create:
```
{ name: "Tax exempt (0%)", rate: 0, isDefault: true, isEnabled: true }
```

**Step 3: Commit**
```
feat(tax-rates): seed default tax rate on workspace creation
```

---

## Phase 2: Backend -- Extend Manual Expense API

### Task 5: Add categoryId and taxRateId to Manual Expense DTO & Service

**Files:**
- Modify: `backend/src/modules/statements/dto/create-manual-expense.dto.ts`
- Modify: `backend/src/modules/statements/statements.service.ts` (lines 103-279)
- Modify: `backend/src/modules/statements/statements.module.ts` (add TaxRate import if needed)

**Step 1: Add fields to DTO**

In `create-manual-expense.dto.ts`, add:
```typescript
@IsString()
@MinLength(1)
categoryId: string;                    // required

@IsString()
@IsOptional()
taxRateId?: string;                    // optional
```

**Step 2: Update `createManualExpense()` in `statements.service.ts`**

After validation of existing fields (around line 137), add:
1. **Validate categoryId** -- verify the category exists and belongs to the workspace:
   ```typescript
   const category = await this.categoryRepository.findOne({
     where: { id: payload.categoryId, workspaceId },
   });
   if (!category) {
     throw new BadRequestException('Category not found');
   }
   ```
2. **Optionally validate taxRateId** -- if provided, verify it exists:
   ```typescript
   let taxRate: TaxRate | null = null;
   if (payload.taxRateId) {
     taxRate = await this.taxRateRepository.findOne({
       where: { id: payload.taxRateId, workspaceId },
     });
     if (!taxRate) {
       throw new BadRequestException('Tax rate not found');
     }
   }
   ```
3. **Set categoryId on the Transaction** (line 243-257 area):
   ```typescript
   const transaction = this.transactionRepository.create({
     ...existingFields,
     categoryId: category.id,       // add this
   });
   ```
4. **Optionally set categoryId on the Statement** too:
   ```typescript
   const statement = this.statementRepository.create({
     ...existingFields,
     category: category,            // or categoryId: category.id
   });
   ```
5. **Store tax rate reference** in the Statement's `parsingDetails` metadata (since there's no taxRateId column on Transaction):
   ```typescript
   parsingDetails: {
     ...existingParsingDetails,
     taxRate: taxRate ? { id: taxRate.id, name: taxRate.name, rate: taxRate.rate } : null,
   },
   ```

**Step 3: Add required repositories to StatementsModule**

In `statements.module.ts`, add `Category` and `TaxRate` to `TypeOrmModule.forFeature([...])`.

Inject them in `StatementsService` constructor.

**Step 4: Commit**
```
feat(statements): accept categoryId and taxRateId in manual expense creation
```

---

## Phase 3: Frontend -- Add Category & Tax Fields to CreateExpenseDrawer

### Task 6: Extend ManualExpenseDraft Type and Validation

**Files:**
- Modify: `frontend/app/lib/statement-expense-drawer.ts`

**Step 1: Add `categoryId` and `taxRateId` to `ManualExpenseDraft`**

```typescript
export type ManualExpenseDraft = {
  amount: string;
  currency: string;
  description: string;
  merchant: string;
  categoryId: string;           // add - required
  taxRateId: string;            // add - optional (empty string = none)
};
```

**Step 2: Update `createDefaultManualDraft()`** in `CreateExpenseDrawer.tsx` (line 50-55):
```typescript
const createDefaultManualDraft = (): ManualExpenseDraft => ({
  amount: '',
  currency: 'KZT',
  description: '',
  merchant: '',
  categoryId: '',
  taxRateId: '',
});
```

**Step 3: Update `validateManualExpenseDraft()`** to include category validation:
```typescript
export function validateManualExpenseDraft(draft: ManualExpenseDraft): {
  amount: boolean;
  merchant: boolean;
  category: boolean;
} {
  const parsedAmount = Number(draft.amount);
  return {
    amount: Number.isFinite(parsedAmount) && parsedAmount > 0,
    merchant: draft.merchant.trim().length > 0,
    category: draft.categoryId.trim().length > 0,
  };
}
```

**Step 4: Commit**
```
feat(lib): extend ManualExpenseDraft with categoryId and taxRateId
```

---

### Task 7: Add Category and Tax Rate Props to CreateExpenseDrawer

**Files:**
- Modify: `frontend/app/(main)/statements/components/CreateExpenseDrawer.tsx`

**Step 1: Define types for tax rate data**

At the top of the file or in a shared types file, add:
```typescript
type TaxRateOption = {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
};
```

**Step 2: Add new props to `Props` type (lines 33-48)**

```typescript
type Props = {
  open: boolean;
  initialMode: StatementExpenseMode;
  onClose: () => void;
  categories: StatementCategoryNode[];      // add
  taxRates: TaxRateOption[];                // add
  onSubmitScan: (payload: { ... }) => Promise<void>;
  onSubmitManual: (payload: { ... }) => Promise<void>;
};
```

**Step 3: Add state for sub-drawer visibility**

```typescript
const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
const [taxRateDrawerOpen, setTaxRateDrawerOpen] = useState(false);
```

**Step 4: Commit**
```
feat(CreateExpenseDrawer): add category and taxRate props and sub-drawer state
```

---

### Task 8: Render Category and Tax Fields in the Details Step

**Files:**
- Modify: `frontend/app/(main)/statements/components/CreateExpenseDrawer.tsx` (lines 462-561, the "details" step)

**Step 1: Add Category field row** (after Merchant field, before Date)

Insert between the Merchant divider (line 542) and the Date section (line 544):

```tsx
<div className="h-px bg-gray-100" />

<button
  type="button"
  onClick={() => setCategoryDrawerOpen(true)}
  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[#f8f7f4]"
>
  <div className="flex-1">
    <p className="text-sm text-[#70817b]">Category</p>
    <p className="mt-2 text-lg font-semibold text-[#0f3428]">
      {selectedCategoryName || 'Required'}
    </p>
    {!manualValidation.category && (
      <p className="mt-1 text-sm text-red-500">This field is required</p>
    )}
  </div>
  <ChevronRight className="h-8 w-8 text-[#9ea6a0]" />
</button>
```

Where `selectedCategoryName` is a useMemo:
```typescript
const selectedCategoryName = useMemo(() => {
  if (!manualDraft.categoryId) return '';
  const flat = flattenStatementCategories(categories);
  return flat.find(c => c.id === manualDraft.categoryId)?.name || '';
}, [manualDraft.categoryId, categories]);
```

**Step 2: Add Tax field row** (after Date, at the end of the fields card)

```tsx
<div className="h-px bg-gray-100" />

<button
  type="button"
  onClick={() => setTaxRateDrawerOpen(true)}
  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[#f8f7f4]"
>
  <div className="flex-1">
    <p className="text-sm text-[#70817b]">Tax</p>
    <p className="mt-2 text-lg font-semibold text-[#0f3428]">
      {selectedTaxRateName || 'Optional'}
    </p>
  </div>
  <ChevronRight className="h-8 w-8 text-[#9ea6a0]" />
</button>
```

Where `selectedTaxRateName` is:
```typescript
const selectedTaxRateName = useMemo(() => {
  if (!manualDraft.taxRateId) {
    const defaultRate = taxRates.find(tr => tr.isDefault);
    return defaultRate ? `${defaultRate.name}` : '';
  }
  const rate = taxRates.find(tr => tr.id === manualDraft.taxRateId);
  return rate ? rate.name : '';
}, [manualDraft.taxRateId, taxRates]);
```

**Step 3: Update validation check in `handleSubmitManual`** (line 241):

```typescript
if (!manualValidation.amount || !manualValidation.merchant || !manualValidation.category) {
  setError('Amount, merchant, and category are required');
  return;
}
```

**Step 4: Commit**
```
feat(CreateExpenseDrawer): render Category and Tax field rows in details step
```

---

### Task 9: Add Category Drawer Overlay to CreateExpenseDrawer

**Files:**
- Create: `frontend/app/(main)/statements/components/CategorySelectionList.tsx`
- Modify: `frontend/app/(main)/statements/components/CreateExpenseDrawer.tsx`
- Modify: `frontend/app/(main)/statements/[id]/edit/StatementCategoryDrawer.tsx`

The key requirement: the category drawer must open at the **same width as the parent drawer (`lg`)** and layer on top of it, not replace it.

**Step 1: Extract category selection list into `CategorySelectionList.tsx`**

Extract the list/search rendering from `StatementCategoryDrawer.tsx` (lines 72-125) into a shared component that both `StatementCategoryDrawer` and `CreateExpenseDrawer` can use:

```tsx
'use client';

import { type StatementCategoryNode, filterStatementCategories } from '@/app/lib/statement-categories';
import { Check, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

type Props = {
  categories: StatementCategoryNode[];
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
  disabled?: boolean;
  showAllOption?: boolean;
  labels?: {
    searchPlaceholder?: string;
    allOption?: string;
    noResults?: string;
  };
};

export default function CategorySelectionList({
  categories,
  selectedCategoryId,
  onSelect,
  disabled = false,
  showAllOption = false,
  labels = {},
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = useMemo(
    () => filterStatementCategories(categories, searchQuery),
    [categories, searchQuery],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 pb-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder={labels.searchPlaceholder || 'Search categories'}
            className="h-14 w-full rounded-2xl border border-emerald-400 bg-white pl-12 pr-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-transparent">
          {showAllOption && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect('')}
              className={`flex w-full items-center justify-between px-4 py-5 text-left text-base font-semibold transition-colors ${
                selectedCategoryId === ''
                  ? 'bg-[#ede8e1] text-[#073b32]'
                  : 'text-[#073b32] hover:bg-gray-50'
              }`}
            >
              <span>{labels.allOption || 'All'}</span>
              {selectedCategoryId === '' && <Check className="h-6 w-6 text-emerald-500" />}
            </button>
          )}

          {filteredCategories.length === 0 ? (
            <div className="px-4 py-8 text-base text-gray-500">
              {labels.noResults || 'No categories found'}
            </div>
          ) : (
            filteredCategories.map(category => {
              const isSelected = selectedCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(category.id)}
                  className={`flex w-full items-center justify-between px-4 py-5 text-left text-base font-semibold transition-colors ${
                    isSelected ? 'bg-[#ede8e1] text-[#073b32]' : 'text-[#073b32] hover:bg-gray-50'
                  }`}
                >
                  <span>{category.name}</span>
                  {isSelected && <Check className="h-6 w-6 text-emerald-500" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Refactor `StatementCategoryDrawer` to use `CategorySelectionList`**

Replace lines 72-125 in `StatementCategoryDrawer.tsx` with:
```tsx
<CategorySelectionList
  categories={categories}
  selectedCategoryId={selectedCategoryId}
  onSelect={onSelect}
  disabled={selecting}
  showAllOption={true}
  labels={labels}
/>
```

Remove the now-unused `searchQuery` state, `filteredCategories` memo, and `useEffect` from `StatementCategoryDrawer`.

**Step 3: Render Category drawer in CreateExpenseDrawer**

Add inside the returned JSX (as a sibling after the main `DrawerShell`):

```tsx
<DrawerShell
  isOpen={categoryDrawerOpen}
  onClose={() => setCategoryDrawerOpen(false)}
  position="right"
  width="lg"
  showCloseButton={false}
  className="max-w-full border-l-0 bg-[#fbfaf8] sm:max-w-lg"
  title={
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setCategoryDrawerOpen(false)}
        className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
        aria-label="Close category drawer"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="text-lg font-semibold text-[#073b32]">Category</span>
    </div>
  }
>
  <CategorySelectionList
    categories={categories}
    selectedCategoryId={manualDraft.categoryId}
    onSelect={(categoryId) => {
      setManualDraft(prev => ({ ...prev, categoryId }));
      setCategoryDrawerOpen(false);
    }}
  />
</DrawerShell>
```

**Important:** Since `DrawerShell` renders via `createPortal(drawer, document.body)` and uses `z-[2000]`, both the parent and category drawers will be at the same z-index. The category drawer will naturally overlay on top because it renders later in the DOM. If needed, add a slightly higher z-index to the sub-drawer's className.

**Step 4: Commit**
```
refactor(categories): extract CategorySelectionList, add category drawer to CreateExpenseDrawer
```

---

### Task 10: Add Tax Rate Drawer Overlay to CreateExpenseDrawer

**Files:**
- Modify: `frontend/app/(main)/statements/components/CreateExpenseDrawer.tsx`

**Step 1: Add the Tax Rate drawer (same pattern as category)**

```tsx
<DrawerShell
  isOpen={taxRateDrawerOpen}
  onClose={() => setTaxRateDrawerOpen(false)}
  position="right"
  width="lg"
  showCloseButton={false}
  className="max-w-full border-l-0 bg-[#fbfaf8] sm:max-w-lg"
  title={
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setTaxRateDrawerOpen(false)}
        className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
        aria-label="Close tax rate drawer"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="text-lg font-semibold text-[#073b32]">Tax rate</span>
    </div>
  }
>
  <div className="flex h-full flex-col">
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-transparent">
        {taxRates.map(taxRate => {
          const isSelected = manualDraft.taxRateId === taxRate.id ||
            (!manualDraft.taxRateId && taxRate.isDefault);
          const label = `${taxRate.name}${taxRate.isDefault ? ' \u00B7 Default' : ''}`;
          return (
            <button
              key={taxRate.id}
              type="button"
              onClick={() => {
                setManualDraft(prev => ({ ...prev, taxRateId: taxRate.id }));
                setTaxRateDrawerOpen(false);
              }}
              className={`flex w-full items-center justify-between px-4 py-5 text-left text-base font-semibold transition-colors ${
                isSelected ? 'bg-[#ede8e1] text-[#073b32]' : 'text-[#073b32] hover:bg-gray-50'
              }`}
            >
              <span>{label}</span>
              {isSelected && <Check className="h-6 w-6 text-emerald-500" />}
            </button>
          );
        })}
      </div>
    </div>
  </div>
</DrawerShell>
```

**Step 2: Update `handleBackClick`** to handle sub-drawer closing:

```typescript
const handleBackClick = () => {
  if (categoryDrawerOpen) {
    setCategoryDrawerOpen(false);
    return;
  }
  if (taxRateDrawerOpen) {
    setTaxRateDrawerOpen(false);
    return;
  }
  // ... existing back logic
};
```

**Step 3: Reset sub-drawer state on close** in `handleClose()`:
```typescript
setCategoryDrawerOpen(false);
setTaxRateDrawerOpen(false);
```

**Step 4: Reset sub-drawer state on open** in the `useEffect` for `open` (line 129-141):
```typescript
setCategoryDrawerOpen(false);
setTaxRateDrawerOpen(false);
```

**Step 5: Commit**
```
feat(CreateExpenseDrawer): add Tax Rate selection drawer overlay
```

---

## Phase 4: Frontend -- Wire Up Data Fetching & Submission

### Task 11: Fetch Categories and Tax Rates in StatementsListView

**Files:**
- Modify: `frontend/app/(main)/statements/components/StatementsListView.tsx`

**Step 1: Add state for categories and tax rates**

```typescript
const [categories, setCategories] = useState<StatementCategoryNode[]>([]);
const [taxRates, setTaxRates] = useState<TaxRateOption[]>([]);
```

**Step 2: Fetch categories and tax rates**

In the data-loading `useEffect` or `loadStatements` function, add parallel fetches:

```typescript
const [categoriesRes, taxRatesRes] = await Promise.all([
  apiClient.get('/categories?type=expense'),
  apiClient.get('/tax-rates'),
]);

setCategories(categoriesRes.data?.data || categoriesRes.data || []);
setTaxRates(taxRatesRes.data?.data || taxRatesRes.data || []);
```

Filter to only enabled categories:
```typescript
const enabledCategories = filterEnabledCategories(categoriesRes.data?.data || categoriesRes.data || []);
setCategories(enabledCategories);
```

**Step 3: Pass categories and taxRates to CreateExpenseDrawer** (around line 1578-1590):

```tsx
<CreateExpenseDrawer
  open={expenseDrawerOpen}
  initialMode={expenseDrawerMode}
  categories={categories}
  taxRates={taxRates}
  onClose={() => setExpenseDrawerOpen(false)}
  onSubmitScan={handleUploadForExpenseDrawer}
  onSubmitManual={handleCreateManualExpense}
/>
```

**Step 4: Commit**
```
feat(StatementsListView): fetch and pass categories/taxRates to CreateExpenseDrawer
```

---

### Task 12: Update handleCreateManualExpense to Send categoryId and taxRateId

**Files:**
- Modify: `frontend/app/(main)/statements/components/StatementsListView.tsx` (lines 804-846)

**Step 1: Add categoryId and taxRateId to the FormData payload**

In `buildPayload()` (lines 810-822):
```typescript
formData.append('categoryId', payload.draft.categoryId);
if (payload.draft.taxRateId) {
  formData.append('taxRateId', payload.draft.taxRateId);
}
```

**Step 2: Set default taxRateId if not selected**

Before building the payload, if `draft.taxRateId` is empty but there's a default tax rate, use it:
```typescript
const effectiveTaxRateId = payload.draft.taxRateId ||
  taxRates.find(tr => tr.isDefault)?.id || '';
if (effectiveTaxRateId) {
  formData.append('taxRateId', effectiveTaxRateId);
}
```

**Step 3: Commit**
```
feat(StatementsListView): send categoryId and taxRateId in manual expense payload
```

---

## Phase 5: Verification & Testing

### Task 13: Backend Unit Tests for TaxRate CRUD

**Files:**
- Create: `backend/@tests/unit/tax-rates.service.spec.ts`

**Step 1: Write tests for:**
- `findAll` returns tax rates for workspace
- `create` creates a tax rate
- `create` with `isDefault: true` unsets previous default
- `update` updates fields
- `remove` deletes the tax rate
- `createDefaultTaxRates` seeds the default "Tax exempt (0%)" rate

**Step 2: Run tests**
```bash
cd backend && npx jest @tests/unit/tax-rates.service.spec.ts --verbose
```

**Step 3: Commit**
```
test(tax-rates): add unit tests for TaxRatesService
```

---

### Task 14: Backend Tests for Extended Manual Expense

**Files:**
- Modify or create: `backend/@tests/unit/statements.service.spec.ts` (or `backend/@tests/e2e/statements.e2e-spec.ts`)

**Step 1: Add test cases:**
- Manual expense with valid categoryId succeeds
- Manual expense without categoryId fails with 400
- Manual expense with invalid categoryId fails with 400
- Manual expense with valid taxRateId succeeds
- Manual expense without taxRateId succeeds (optional field)

**Step 2: Run tests**
```bash
cd backend && npm run test
```

**Step 3: Commit**
```
test(statements): add tests for categoryId/taxRateId in manual expense creation
```

---

### Task 15: Lint, Build, and Manual Verification

**Step 1: Run lint**
```bash
make lint
```

**Step 2: Run full test suite**
```bash
make test
```

**Step 3: Run the app and manually verify:**
1. Open the Create Expense drawer in Manual mode
2. Verify Category field appears after Merchant with "Required" placeholder
3. Verify Tax field appears after Date with the default tax rate name
4. Click Category -- verify drawer slides in at same width as parent
5. Select a category -- verify drawer closes, selection is shown
6. Click Tax -- verify tax rate drawer slides in at same width
7. Select a tax rate -- verify drawer closes, selection is shown
8. Submit the expense -- verify categoryId and taxRateId are sent in the request
9. Verify the created expense/transaction has the correct category assigned

**Step 4: Commit**
```
chore: verify lint and tests pass for category/tax manual expense feature
```

---

## Summary of Files Changed

### Backend (new files)
- `backend/src/entities/tax-rate.entity.ts`
- `backend/src/migrations/<timestamp>-CreateTaxRatesTable.ts`
- `backend/src/modules/tax-rates/tax-rates.module.ts`
- `backend/src/modules/tax-rates/tax-rates.controller.ts`
- `backend/src/modules/tax-rates/tax-rates.service.ts`
- `backend/src/modules/tax-rates/dto/create-tax-rate.dto.ts`
- `backend/src/modules/tax-rates/dto/update-tax-rate.dto.ts`
- `backend/@tests/unit/tax-rates.service.spec.ts`

### Backend (modified files)
- `backend/src/entities/index.ts` -- add TaxRate export
- `backend/src/app.module.ts` -- register TaxRatesModule
- `backend/src/modules/statements/dto/create-manual-expense.dto.ts` -- add categoryId, taxRateId
- `backend/src/modules/statements/statements.service.ts` -- validate & use categoryId/taxRateId
- `backend/src/modules/statements/statements.module.ts` -- add Category, TaxRate to imports
- Workspace creation flow file -- seed default tax rates

### Frontend (new files)
- `frontend/app/(main)/statements/components/CategorySelectionList.tsx`

### Frontend (modified files)
- `frontend/app/lib/statement-expense-drawer.ts` -- extend ManualExpenseDraft type & validation
- `frontend/app/(main)/statements/components/CreateExpenseDrawer.tsx` -- add Category/Tax fields, add sub-drawer overlays
- `frontend/app/(main)/statements/components/StatementsListView.tsx` -- fetch categories/taxRates, pass to drawer, send in API payload
- `frontend/app/(main)/statements/[id]/edit/StatementCategoryDrawer.tsx` -- refactor to use CategorySelectionList

---

## Key Design Decisions

1. **Drawer overlay pattern:** Both category and tax drawers use `DrawerShell` with `width="lg"` + `className="max-w-full sm:max-w-lg"` (identical to parent). Since `DrawerShell` portals to `document.body`, later-rendered drawers naturally overlay earlier ones. The existing `z-[2000]` + `bg-black/40` backdrop handles layering correctly.

2. **Category is required, Tax is optional:** Category validation is added to `validateManualExpenseDraft()`. Tax rate defaults to the workspace's default tax rate if not explicitly selected.

3. **CategorySelectionList extraction:** Shared component avoids code duplication between `StatementCategoryDrawer` and `CreateExpenseDrawer`.

4. **Tax rate as metadata on Statement:** Since the `Transaction` entity has no `taxRateId` column, the tax rate reference is stored in the Statement's `parsingDetails` JSONB field. A future migration could add a proper `tax_rate_id` FK to `transactions` if needed.
