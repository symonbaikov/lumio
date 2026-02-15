# Category Disable with Transaction Warnings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the "Failed to save category" error when toggling category enabled state, and show red warnings on transactions/statements that reference a disabled category.

**Architecture:** The backend `update` method has an un-caught audit service call that may fail with circular JSON serialization. We fix the bug, add a new endpoint to count category usage, add a confirmation dialog on the frontend, filter disabled categories from selectors, and show red warnings where disabled categories are displayed.

**Tech Stack:** NestJS (TypeORM), Next.js 14, Tailwind CSS, Axios

---

## Root Cause Analysis

The error "Failed to save category" happens because:

1. In `categories.service.ts:161`, `const before = { ...category }` creates a shallow copy of a Category entity loaded with `relations: ['children', 'parent']`. These TypeORM relation objects can contain circular references (parent -> children -> parent).
2. At line 190-202, `await this.auditService.createEvent({ diff: { before, after: saved } })` tries to serialize these objects into a JSONB column, which fails on circular references.
3. This call is **awaited without try/catch**, so the error propagates to the client even though `categoryRepository.save()` on line 185 already succeeded.
4. Additionally, there's a **double audit**: both the `@Audit` interceptor (controller line 59) and the service-level `createEvent` call (service line 190) record audit events for the same operation.

---

### Task 1: Fix the audit serialization bug in categories.service.ts

**Files:**
- Modify: `backend/src/modules/categories/categories.service.ts:161` and lines 190-202

**Step 1: Write the failing test**

File: `backend/@tests/unit/categories.service.spec.ts` (create or modify existing)

```typescript
describe('CategoriesService.update', () => {
  it('should successfully toggle isEnabled without audit error', async () => {
    // Mock a category with parent and children relations (potential circular refs)
    const mockCategory = {
      id: 'cat-1',
      name: 'Test',
      workspaceId: 'ws-1',
      isSystem: false,
      isEnabled: true,
      parentId: null,
      parent: null,
      children: [],
      type: 'expense',
      color: null,
      icon: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    categoryRepository.findOne.mockResolvedValue(mockCategory);
    categoryRepository.save.mockResolvedValue({ ...mockCategory, isEnabled: false });
    auditService.createEvent.mockRejectedValue(new Error('Circular JSON'));

    // Should NOT throw even if audit fails
    const result = await service.update('cat-1', 'ws-1', 'user-1', { isEnabled: false });
    expect(result.isEnabled).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest --testPathPattern='categories.service' --no-coverage -t 'toggle isEnabled'`
Expected: FAIL (audit error propagates)

**Step 3: Fix the serialization and error handling**

In `backend/src/modules/categories/categories.service.ts`, make two changes:

**Change 1:** Replace `const before = { ...category }` with a clean plain-object snapshot (line 161):

```typescript
// Before:
const before = { ...category };

// After:
const before = {
  id: category.id,
  name: category.name,
  type: category.type,
  workspaceId: category.workspaceId,
  userId: category.userId,
  parentId: category.parentId,
  isSystem: category.isSystem,
  isEnabled: category.isEnabled,
  color: category.color,
  icon: category.icon,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
};
```

**Change 2:** Wrap the service-level audit call in try/catch (lines 190-202):

```typescript
// Before:
await this.auditService.createEvent({
  ...
});

// After:
try {
  await this.auditService.createEvent({
    workspaceId,
    actorType: ActorType.USER,
    actorId: userId,
    entityType: EntityType.CATEGORY,
    entityId: saved.id,
    action: AuditAction.UPDATE,
    diff: {
      before,
      after: {
        id: saved.id,
        name: saved.name,
        type: saved.type,
        workspaceId: saved.workspaceId,
        parentId: saved.parentId,
        isSystem: saved.isSystem,
        isEnabled: saved.isEnabled,
        color: saved.color,
        icon: saved.icon,
      },
    },
    meta: parentChanged
      ? { parentChange: { from: before.parentId ?? null, to: saved.parentId ?? null } }
      : undefined,
    isUndoable: true,
  });
} catch (error) {
  this.logger.warn(`Audit event failed for category ${saved.id}: ${error?.message || error}`);
}
```

> **Note:** Add `private readonly logger = new Logger(CategoriesService.name);` if it doesn't already exist, and import `Logger` from `@nestjs/common`.

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest --testPathPattern='categories.service' --no-coverage -t 'toggle isEnabled'`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/modules/categories/categories.service.ts backend/@tests/unit/categories.service.spec.ts
git commit -m "fix(categories): prevent audit serialization error when toggling isEnabled"
```

---

### Task 2: Add backend endpoint to count category usage

**Files:**
- Modify: `backend/src/modules/categories/categories.service.ts`
- Modify: `backend/src/modules/categories/categories.controller.ts`
- Modify: `backend/src/modules/categories/categories.module.ts` (if repositories need adding)

**Step 1: Write the failing test**

```typescript
describe('CategoriesService.getCategoryUsageCount', () => {
  it('should return count of transactions and statements using the category', async () => {
    transactionRepository.count.mockResolvedValue(15);
    statementRepository.count.mockResolvedValue(3);

    const result = await service.getCategoryUsageCount('cat-1', 'ws-1');
    expect(result).toEqual({ transactions: 15, statements: 3, total: 18 });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest --testPathPattern='categories.service' --no-coverage -t 'getCategoryUsageCount'`
Expected: FAIL

**Step 3: Add the service method**

In `backend/src/modules/categories/categories.service.ts`, inject Transaction and Statement repositories and add:

```typescript
async getCategoryUsageCount(
  categoryId: string,
  workspaceId: string,
): Promise<{ transactions: number; statements: number; total: number }> {
  const [transactions, statements] = await Promise.all([
    this.transactionRepository.count({
      where: { categoryId, statement: { workspaceId } },
    }),
    this.statementRepository.count({
      where: { categoryId, workspaceId },
    }),
  ]);

  return { transactions, statements, total: transactions + statements };
}
```

> **Note:** Inject `transactionRepository` and `statementRepository` into the service constructor if not already present. Use `@InjectRepository(Transaction)` and `@InjectRepository(Statement)`. Also register these in `categories.module.ts` via `TypeOrmModule.forFeature([..., Transaction, Statement])`.

**Step 4: Add the controller endpoint**

In `backend/src/modules/categories/categories.controller.ts`, add **before** the `@Get(':id')` endpoint (to avoid route conflict):

```typescript
@Get(':id/usage-count')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
@RequirePermission(Permission.CATEGORY_VIEW)
async getUsageCount(
  @Param('id') id: string,
  @WorkspaceId() workspaceId: string,
) {
  return this.categoriesService.getCategoryUsageCount(id, workspaceId);
}
```

> **Important:** Place this route ABOVE `@Get(':id')` to avoid NestJS treating `usage-count` as a UUID parameter.

**Step 5: Run tests**

Run: `cd backend && npx jest --testPathPattern='categories' --no-coverage`
Expected: PASS

**Step 6: Commit**

```bash
git add backend/src/modules/categories/categories.service.ts backend/src/modules/categories/categories.controller.ts backend/src/modules/categories/categories.module.ts
git commit -m "feat(categories): add endpoint to get category usage count"
```

---

### Task 3: Add `isEnabled` to the frontend Category types

**Files:**
- Modify: `frontend/app/components/transactions/types.ts`

**Step 1: Update the frontend Category type**

In `frontend/app/components/transactions/types.ts`, add `isEnabled` to both Category and the category reference inside Transaction:

```typescript
// Line 20 - Transaction.category
category?: { id: string; name: string; color?: string; isEnabled?: boolean };

// Line 30-36 - Category interface
export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
  isEnabled?: boolean;  // <-- add this
}
```

**Step 2: Verify the backend already returns `isEnabled`**

The `findAll` method returns full Category entities including `isEnabled`. No backend changes needed.

**Step 3: Commit**

```bash
git add frontend/app/components/transactions/types.ts
git commit -m "feat(types): add isEnabled field to frontend Category type"
```

---

### Task 4: Add confirmation dialog to WorkspaceCategoriesView

**Files:**
- Modify: `frontend/app/(main)/workspaces/components/WorkspaceCategoriesView.tsx`

**Step 1: Add state for the confirmation dialog**

Add near line 125 (existing state declarations):

```typescript
const [disableConfirm, setDisableConfirm] = useState<{
  category: Category;
  usageCount: { transactions: number; statements: number; total: number };
} | null>(null);
```

**Step 2: Modify `handleToggleEnabled` to show confirmation when disabling**

Replace the existing `handleToggleEnabled` (lines 213-236) with:

```typescript
const handleToggleEnabled = async (category: Category) => {
  if (togglingIds.has(category.id)) return;

  const nextEnabled = category.isEnabled === false;

  // If we're disabling, check usage and show confirmation
  if (!nextEnabled) {
    try {
      const { data: usageCount } = await apiClient.get(
        `/categories/${category.id}/usage-count`,
      );
      if (usageCount.total > 0) {
        setDisableConfirm({ category, usageCount });
        return;
      }
    } catch {
      // If usage count fails, proceed without confirmation
    }
  }

  await performToggle(category, nextEnabled);
};

const performToggle = async (category: Category, nextEnabled: boolean) => {
  setDisableConfirm(null);
  setTogglingIds(prev => new Set(prev).add(category.id));

  try {
    await apiClient.put(`/categories/${category.id}`, { isEnabled: nextEnabled });
    setCategories(prev =>
      prev.map(item =>
        item.id === category.id ? { ...item, isEnabled: nextEnabled } : item,
      ),
    );
  } catch (error) {
    console.error('Failed to toggle category state:', error);
    toast.error(t.toasts.saveFailed.value);
  } finally {
    setTogglingIds(prev => {
      const next = new Set(prev);
      next.delete(category.id);
      return next;
    });
  }
};
```

**Step 3: Add the confirmation dialog JSX**

Add before the closing fragment or at the end of the JSX return:

```tsx
{/* Disable Category Confirmation Dialog */}
{disableConfirm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
      <h3 className="text-lg font-semibold text-gray-900">
        Disable category &ldquo;{disableConfirm.category.name}&rdquo;?
      </h3>
      <p className="mt-2 text-sm text-gray-600">
        This category is currently used in:
      </p>
      <ul className="mt-2 space-y-1 text-sm text-gray-700">
        {disableConfirm.usageCount.transactions > 0 && (
          <li>
            <span className="font-medium">{disableConfirm.usageCount.transactions}</span>{' '}
            transaction{disableConfirm.usageCount.transactions !== 1 ? 's' : ''}
          </li>
        )}
        {disableConfirm.usageCount.statements > 0 && (
          <li>
            <span className="font-medium">{disableConfirm.usageCount.statements}</span>{' '}
            statement{disableConfirm.usageCount.statements !== 1 ? 's' : ''}
          </li>
        )}
      </ul>
      <p className="mt-3 text-sm text-amber-600">
        These items will show a warning to select a new category.
        You can re-enable this category later to restore it.
      </p>
      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setDisableConfirm(null)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => performToggle(disableConfirm.category, false)}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Disable
        </button>
      </div>
    </div>
  </div>
)}
```

**Step 4: Verify in browser**

1. Navigate to Workspaces -> Categories
2. Click toggle on a category that has transactions assigned
3. Should see confirmation dialog with usage counts
4. Click "Cancel" -> nothing changes
5. Click "Disable" -> category toggles off without error

**Step 5: Commit**

```bash
git add frontend/app/(main)/workspaces/components/WorkspaceCategoriesView.tsx
git commit -m "feat(categories): add confirmation dialog when disabling a category with usage"
```

---

### Task 5: Filter disabled categories from selection dropdowns

**Files:**
- Modify: `frontend/app/components/transactions/TransactionsTable.tsx`
- Modify: `frontend/app/components/transactions/DetailsDrawer.tsx`
- Modify: `frontend/app/(main)/statements/[id]/edit/page.tsx`
- Modify: `frontend/app/(main)/statements/[id]/edit/StatementCategoryDrawer.tsx`
- Modify: `frontend/app/storage/gmail-receipts/components/ReceiptDetailDrawer.tsx`
- Modify: `frontend/app/storage/gmail-receipts/components/BulkActionsBar.tsx`
- Modify: `frontend/app/components/transactions/TransactionsPageView.tsx`
- Modify: `frontend/app/storage/StoragePageContent.tsx`

**Step 1: In every component that renders a category dropdown/selector, filter out disabled categories**

The pattern in each file is the same. Wherever categories are mapped to create `<option>`, `<MenuItem>`, or dropdown items for **selecting/assigning** a category, wrap with a filter:

```typescript
// Before:
categories.map(cat => ...)

// After:
categories.filter(cat => cat.isEnabled !== false).map(cat => ...)
```

**Important:** The filter uses `!== false` rather than `=== true` so that categories without the `isEnabled` field (backward compat) are still shown.

**Key locations to apply this pattern:**

| File | Approx Line(s) | Context |
|---|---|---|
| `TransactionsTable.tsx` | ~277, ~517 | Category reassignment dropdown |
| `DetailsDrawer.tsx` | ~343 | Category select in detail panel |
| `statements/[id]/edit/page.tsx` | ~527, ~1668 | Statement & batch category selects |
| `StatementCategoryDrawer.tsx` | ~117 | Category picker drawer |
| `ReceiptDetailDrawer.tsx` | ~445 | Receipt category select |
| `BulkActionsBar.tsx` | ~66 | Bulk assign category |
| `TransactionsPageView.tsx` | ~186 | Bulk actions bar |
| `StoragePageContent.tsx` | ~453, ~2969 | File category select |

> **Note:** Do NOT filter in filter/search dropdowns (like category filter in TransactionsTable at ~279) — users should still be able to filter by disabled categories to see which items need recategorization.

**Step 2: Verify**

- Open statement edit page
- Category dropdowns should NOT show disabled categories
- Filter dropdowns should still show all categories

**Step 3: Commit**

```bash
git add frontend/
git commit -m "feat(categories): filter disabled categories from selection dropdowns"
```

---

### Task 6: Show red warning for transactions/statements with disabled categories

**Files:**
- Modify: `frontend/app/components/transactions/TransactionsTable.tsx`
- Modify: `frontend/app/components/transactions/DetailsDrawer.tsx`
- Modify: `frontend/app/(main)/statements/[id]/edit/page.tsx`
- Modify: `frontend/app/components/TransactionDocumentViewer.tsx`
- Modify: `frontend/app/components/TransactionsView.tsx`
- Modify: `frontend/app/storage/StoragePageContent.tsx`

**Step 1: Backend — Ensure `isEnabled` is included in the category relation when loading transactions**

In `backend/src/entities/transaction.entity.ts`, the `category` relation is a standard `@ManyToOne` that loads the full Category entity (including `isEnabled`). TypeORM returns all columns by default. No backend changes expected.

**Step 2: Frontend — Show red warning where category is displayed**

The pattern is: wherever a transaction's category name is shown, check if `category.isEnabled === false` and show a red warning.

**TransactionsTable.tsx** (~line 509):

```tsx
// Before:
{tx.category?.name || t.statusUncategorized.value}

// After:
{tx.category ? (
  tx.category.isEnabled === false ? (
    <span className="text-red-600 font-medium">
      {tx.category.name} — select a category
    </span>
  ) : (
    tx.category.name
  )
) : (
  t.statusUncategorized.value
)}
```

**DetailsDrawer.tsx** (~line 314):

```tsx
// Before:
{transaction.category.name}

// After:
{transaction.category.isEnabled === false ? (
  <span className="text-red-600 font-medium">
    {transaction.category.name} — category disabled, please select another
  </span>
) : (
  transaction.category.name
)}
```

**statements/[id]/edit/page.tsx** (~line 1528 — Chip component):

```tsx
// Before:
<Chip label={transaction.category.name} color="primary" size="small" />

// After:
<Chip
  label={
    transaction.category.isEnabled === false
      ? `${transaction.category.name} — disabled`
      : transaction.category.name
  }
  color={transaction.category.isEnabled === false ? 'error' : 'primary'}
  size="small"
/>
```

**TransactionDocumentViewer.tsx** (~line 673):

```tsx
// Before:
label={transaction.category.name}

// After:
label={transaction.category.isEnabled === false ? `${transaction.category.name} — disabled` : transaction.category.name}
color={transaction.category.isEnabled === false ? 'error' : 'primary'}
```

**TransactionsView.tsx** (~line 177):

```tsx
// Before:
<Chip label={tx.category.name} size="small" variant="outlined" />

// After:
<Chip
  label={tx.category.isEnabled === false ? `${tx.category.name} — disabled` : tx.category.name}
  size="small"
  variant="outlined"
  color={tx.category.isEnabled === false ? 'error' : 'default'}
/>
```

**Step 3: Verify**

1. Disable a category in Workspaces -> Categories
2. Navigate to Statements -> open a statement that has transactions with the disabled category
3. Those transactions should show the category name in red with a warning
4. The category dropdown should NOT list the disabled category
5. Re-enable the category -> warnings disappear, category appears in dropdowns again

**Step 4: Commit**

```bash
git add frontend/
git commit -m "feat(categories): show red warning on items with disabled categories"
```

---

### Task 7: Handle disabled categories in receipt views

**Files:**
- Modify: `frontend/app/storage/gmail-receipts/components/ReceiptDetailDrawer.tsx`
- Modify: `frontend/app/storage/StoragePageContent.tsx`

**Step 1: Receipts store `categoryId` inside JSONB `parsedData`**

When showing a receipt's category, we need to cross-reference the `categoryId` from `parsedData` with the fetched categories list to check `isEnabled`.

In `ReceiptDetailDrawer.tsx`, where the current category is displayed, add a check:

```typescript
const currentCategory = categories.find(c => c.id === receipt.parsedData?.categoryId);
const isCategoryDisabled = currentCategory?.isEnabled === false;
```

Then in the JSX where the category name is shown:

```tsx
{isCategoryDisabled ? (
  <span className="text-red-600 font-medium">
    {currentCategory.name} — category disabled
  </span>
) : (
  currentCategory?.name || 'Uncategorized'
)}
```

In `StoragePageContent.tsx`, apply the same pattern where file category is displayed.

**Step 2: Commit**

```bash
git add frontend/app/storage/gmail-receipts/components/ReceiptDetailDrawer.tsx \
  frontend/app/storage/StoragePageContent.tsx
git commit -m "feat(receipts): show warning for disabled categories in receipt views"
```

---

### Task 8: Run full test suite and lint

**Step 1: Run backend tests**

```bash
cd backend && npm run test -- --no-coverage
```
Expected: All tests pass

**Step 2: Run frontend lint**

```bash
make lint
```
Expected: No lint errors

**Step 3: Run frontend build**

```bash
cd frontend && npm run build
```
Expected: Build succeeds

**Step 4: Fix any failures**

Address any type errors, lint issues, or test failures.

**Step 5: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: address lint and type issues from category disable feature"
```

---

## Summary of Changes

| Layer | What | Why |
|---|---|---|
| Backend service | Fix `before` snapshot to use plain object | Prevent circular JSON in audit diff |
| Backend service | Wrap audit call in try/catch | Prevent audit failures from breaking the API response |
| Backend endpoint | `GET /categories/:id/usage-count` | Enable confirmation dialog with usage counts |
| Frontend types | Add `isEnabled` to Category type | Enable isEnabled checks across components |
| Frontend categories view | Add confirmation dialog | Warn user before disabling a used category |
| Frontend dropdowns (8 files) | Filter `isEnabled !== false` | Hide disabled categories from selection |
| Frontend displays (6 files) | Red text/chip for disabled categories | Alert users to recategorize items |
| Frontend receipts (2 files) | Cross-reference category status | Handle JSONB-stored category references |
