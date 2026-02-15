# Trash Page Statements-Style Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Trash page (`/statements/trash`) to match the minimalist card-based style of StatementsListView, removing all unrelated Storage/cloud elements.

**Architecture:** The Trash page currently renders `StoragePageContent` (a 3300-line monolith from the Storage module) with `initialList="trash"`. This shows a heavy `<table>` layout with extraneous Google Drive/Dropbox widgets, a stray `)` bug, and Storage-style columns (Bank, Account, Size, Category, Access). The plan is to create a new dedicated `TrashListView` component that follows the `StatementsListView` pattern: card-based rows, search bar, flat list with minimal columns (receipt icon, type, date, name, actions), matching CSS classes and layout structure. A dedicated `TrashSidePanel` will provide navigation context. All Storage dependencies (`StoragePageContent`) will be removed from the trash route.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, Lucide icons, next-intlayer (i18n), NestJS REST API

---

## Current Problems (from screenshot analysis)

1. **Cloud widgets visible**: Google Drive / Dropbox toggle and widget card shown on Trash page (irrelevant)
2. **Stray `)` rendered**: Bug at line 2051 of `StoragePageContent.tsx` -- visible text artifact
3. **Heavy table layout**: `<table>` with 10 columns (checkbox, file name, bank, account, size, status, category, access, deleted, actions) -- too many columns for a trash view
4. **Style mismatch**: Uses `bg-gray-50` table headers, bordered cells, rounded-full pill buttons -- different from StatementsListView's card-based `rounded-lg border border-gray-200 bg-white p-4` rows
5. **No side panel**: Trash page doesn't register a `SidePanelPageConfig`, so the left sidebar is blank
6. **No search**: The Storage header with search is hidden (`!isTrashView`)

---

## Task 1: Create `TrashListItem` component

**Files:**
- Create: `frontend/app/(main)/statements/components/TrashListItem.tsx`

**Step 1: Create the TrashListItem component**

This component renders a single trash item as a card (matching `StatementsListItem` style at `frontend/app/(main)/statements/components/StatementsListItem.tsx:70-164`) with restore/delete actions instead of "View".

```tsx
'use client';

import { BankLogoAvatar } from '@/app/components/BankLogoAvatar';
import { DocumentTypeIcon } from '@/app/components/DocumentTypeIcon';
import { RotateCcw, Trash2 } from 'lucide-react';
import React from 'react';

export type TrashItem = {
  id: string;
  fileName: string;
  status: string;
  bankName: string;
  fileType: string;
  fileSize: number;
  deletedAt: string | null;
  createdAt: string;
};

type Props = {
  item: TrashItem;
  selected: boolean;
  onToggleSelect: () => void;
  onRestore: () => void;
  onDelete: () => void;
  bankDisplayName: string;
  deletedDateLabel: string;
  expiryBadge: React.ReactNode;
  restoreLabel: string;
  deleteLabel: string;
};

export function TrashListItem({
  item,
  selected,
  onToggleSelect,
  onRestore,
  onDelete,
  bankDisplayName,
  deletedDateLabel,
  expiryBadge,
  restoreLabel,
  deleteLabel,
}: Props) {
  return (
    <div className="relative rounded-lg border border-gray-200 bg-white p-4 transition hover:border-primary/30">
      <div className="relative z-10 flex items-center gap-3">
        {/* Checkbox */}
        <div className="w-4">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>

        {/* Document icon */}
        <div className="w-11 flex items-center justify-center">
          <DocumentTypeIcon
            fileType={item.fileType}
            fileName={item.fileName}
            fileId={item.id}
            size={36}
            className="text-red-500"
          />
        </div>

        <div className="w-3" />

        {/* File type */}
        <div className="w-20 flex items-center gap-2 text-sm font-medium text-gray-500">
          <span className="uppercase">{item.fileType}</span>
        </div>

        {/* Deleted date */}
        <div className="w-28 text-sm font-medium text-gray-500 tabular-nums">
          {deletedDateLabel}
        </div>

        {/* Bank + file name */}
        <div className="flex-1 flex items-center gap-2 text-sm text-gray-900">
          <BankLogoAvatar bankName={item.bankName} size={20} />
          <span className="font-semibold text-gray-900 truncate max-w-[200px]">
            {item.fileName}
          </span>
          {expiryBadge}
        </div>

        {/* Actions: Restore + Delete */}
        <div className="w-36 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onRestore();
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50"
            title={restoreLabel}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {restoreLabel}
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onDelete();
            }}
            className="inline-flex items-center justify-center rounded-md border border-red-200 p-1.5 text-red-400 transition hover:border-red-400 hover:text-red-600 hover:bg-red-50"
            title={deleteLabel}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/app/(main)/statements/components/TrashListItem.tsx
git commit -m "feat(trash): add TrashListItem card component matching statements style"
```

---

## Task 2: Create `TrashListView` component

**Files:**
- Create: `frontend/app/(main)/statements/components/TrashListView.tsx`

**Step 1: Create the TrashListView component**

This is the main view for the Trash page. It follows the same layout pattern as `StatementsListView` (see `frontend/app/(main)/statements/components/StatementsListView.tsx:1003-1004` for the container class reference).

Key design decisions:
- Container: `container-shared flex h-[calc(100vh-var(--global-nav-height,0px))] min-h-0 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8` (same as StatementsListView)
- Search bar at top (same styling as StatementsListView)
- Bulk actions bar below search (selected count + Restore / Delete / Empty Trash)
- Card-based rows using `TrashListItem` (same `space-y-3` layout)
- Column headers as a flex row (same pattern: checkbox, receipt, type, deleted, name, actions)
- Pagination at bottom (same styling)
- Uses the trash API endpoints from `StoragePageContent` (see Task 6)
- Confirm modals for permanent delete and empty trash (use `ConfirmModal` from `@/app/components/ConfirmModal`)

The component should:
1. Fetch trashed files from API
2. Support search (client-side filter by fileName)
3. Support selection (checkbox per row + select all)
4. Bulk restore selected
5. Bulk permanent delete selected (with confirm modal)
6. Empty entire trash (with confirm modal)
7. Show expiry badge per item (days remaining until auto-delete)
8. Paginate with same style as StatementsListView
9. Accept `onCountChange?: (count: number) => void` prop

**Implementation reference files:**
- Layout/container pattern: `StatementsListView.tsx:1003-1004`
- Search bar: `StatementsListView.tsx:1006-1018`
- Selection actions bar: `StatementsListView.tsx:1019-1061`
- Column header row: `StatementsListView.tsx:1220-1245`
- Card rows: `StatementsListView.tsx:1246-1296` (uses `StatementsListItem`)
- Pagination: `StatementsListView.tsx:1298-1325`
- API calls for trash: `StoragePageContent.tsx` -- search for `handleRestoreFromTrash`, `handlePermanentDelete`, `handleBulkRestore`, `handleBulkDelete`, `handleEmptyTrash`, and the `loadFiles` function when `activeList === 'trash'`
- Expiry badge logic: `StoragePageContent.tsx:1532-1559` (`renderTrashExpiryBadge`) -- calculates days remaining from `deletedAt`, 30-day TTL
- i18n content: `frontend/app/storage/page.content.ts` (trash section, lines 174-296) -- reuse/adapt keys

Bulk action bar (below search, visible when `selectedCount > 0`):
- Pattern: same as `StatementsListView.tsx:1019-1061` but with Restore/Delete/EmptyTrash buttons
- Selected count pill: `inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[13px] font-medium text-white`
- Restore button: emerald-styled, matching `StatementsListView` chip style
- Delete button: red-styled
- Empty Trash button: gray-styled

When `selectedCount === 0`, show nothing (no filter chips needed for trash).

**Step 2: Commit**

```bash
git add frontend/app/(main)/statements/components/TrashListView.tsx
git commit -m "feat(trash): add TrashListView with card-based layout matching statements"
```

---

## Task 3: Create `TrashSidePanel` component

**Files:**
- Create: `frontend/app/(main)/statements/components/TrashSidePanel.tsx`

**Step 1: Create the TrashSidePanel component**

This registers a `SidePanelPageConfig` so the Trash page gets a proper left sidebar (like all other statements pages). Reference: `StatementsSidePanel.tsx` at `frontend/app/(main)/statements/components/StatementsSidePanel.tsx:224-344`.

```tsx
'use client';

import { type SidePanelPageConfig, useSidePanelConfig } from '@/app/components/side-panel';
import { Trash2 } from 'lucide-react';
import { useMemo } from 'react';

type Props = {
  trashCount: number;
};

export default function TrashSidePanel({ trashCount }: Props) {
  const sidePanelConfig = useMemo<SidePanelPageConfig>(
    () => ({
      pageId: 'statements-trash',
      header: {
        title: 'Statements',
        subtitle: 'Trash',
      },
      sections: [
        {
          id: 'trash-info',
          type: 'navigation',
          title: 'Trash',
          items: [
            {
              id: 'trash',
              label: 'Trash',
              icon: Trash2,
              badge: trashCount,
              badgeVariant: 'default',
              active: true,
              href: '/statements/trash',
            },
          ],
        },
      ],
    }),
    [trashCount],
  );

  useSidePanelConfig({ config: sidePanelConfig, autoRegister: true });

  return null;
}
```

**Step 2: Commit**

```bash
git add frontend/app/(main)/statements/components/TrashSidePanel.tsx
git commit -m "feat(trash): add TrashSidePanel for left sidebar navigation"
```

---

## Task 4: Update Trash page to use new components

**Files:**
- Modify: `frontend/app/(main)/statements/trash/page.tsx`

**Step 1: Replace StoragePageContent with new components**

Change `page.tsx` from:

```tsx
'use client';

import StoragePageContent from '@/app/storage/StoragePageContent';

export default function StatementsTrashPage() {
  return <StoragePageContent initialList="trash" />;
}
```

To:

```tsx
'use client';

import { useState } from 'react';
import TrashListView from '../components/TrashListView';
import TrashSidePanel from '../components/TrashSidePanel';

export default function StatementsTrashPage() {
  const [trashCount, setTrashCount] = useState(0);

  return (
    <>
      <TrashSidePanel trashCount={trashCount} />
      <TrashListView onCountChange={setTrashCount} />
    </>
  );
}
```

**Step 2: Run dev server and verify**

```bash
cd frontend && npm run dev
```

Navigate to `/statements/trash` and verify:
- No Google Drive / Dropbox widgets visible
- No stray `)` character
- Side panel appears with "Trash" navigation
- Card-based item layout (not table)
- Search bar at top
- Pagination at bottom

**Step 3: Commit**

```bash
git add frontend/app/(main)/statements/trash/page.tsx
git commit -m "feat(trash): switch trash page from StoragePageContent to dedicated components"
```

---

## Task 5: Verify and fix API endpoints

**Files:**
- Read: `backend/src/modules/` -- find storage/statements controller
- Possibly modify: `frontend/app/(main)/statements/components/TrashListView.tsx`

**Step 1: Verify trash API endpoints exist**

Check what endpoints `StoragePageContent` uses for trash operations. Search for these patterns in `StoragePageContent.tsx`:
- `api.get` with `trash` or `deleted` params -- for loading trashed files
- `api.post` or `api.patch` with `restore` -- for restoring from trash
- `api.delete` with `permanent` -- for permanent deletion
- `api.delete` or `api.post` with `empty` -- for emptying trash

Also check the backend controller to confirm endpoint signatures.

**Step 2: Ensure TrashListView uses the correct endpoints**

Update the API calls in `TrashListView` to match the actual backend endpoints.

**Step 3: Commit if changes needed**

```bash
git add frontend/app/(main)/statements/components/TrashListView.tsx
git commit -m "fix(trash): align API endpoints with backend controller"
```

---

## Task 6: Add i18n content for the new trash view

**Files:**
- Modify: `frontend/app/(main)/statements/page.content.ts`
- Modify: `frontend/app/(main)/statements/components/TrashListView.tsx`

**Step 1: Add trash section to statements i18n content**

Add these keys to the `statementsPage` content dictionary:
- `trash.title` - "Trash"
- `trash.searchPlaceholder` - "Search in trash..."
- `trash.selectedCount` - "{count} selected"
- `trash.restore` - "Restore"
- `trash.delete` - "Delete"
- `trash.emptyTrash` - "Empty trash"
- `trash.emptyTitle` - "Trash is empty"
- `trash.emptyDescription` - "Deleted statements will appear here"
- `trash.expiresIn` - "Deletes in {days}d"
- `trash.expiresToday` - "Deletes today"
- `trash.confirmDeleteTitle` - "Delete permanently?"
- `trash.confirmDeleteMessage` - "This action cannot be undone."
- `trash.confirmEmptyTitle` - "Empty trash?"
- `trash.confirmEmptyMessage` - "All items in trash will be permanently deleted."
- `trash.restoreSuccess` - "Item restored"
- `trash.deleteSuccess` - "Item permanently deleted"
- `trash.emptySuccess` - "Trash emptied"
- `trash.listHeader.receipt` - "Receipt"
- `trash.listHeader.type` - "Type"
- `trash.listHeader.deleted` - "Deleted"
- `trash.listHeader.name` - "Name"
- `trash.listHeader.actions` - "Actions"

Reference existing i18n in `frontend/app/storage/page.content.ts:174-296`.

**Step 2: Update TrashListView to use i18n**

Replace hardcoded strings with `useIntlayer('statementsPage')` calls.

**Step 3: Commit**

```bash
git add frontend/app/(main)/statements/page.content.ts frontend/app/(main)/statements/components/TrashListView.tsx
git commit -m "feat(trash): add i18n content for redesigned trash view"
```

---

## Task 7: Final polish, lint, and manual testing

**Step 1: Run lint and format**

```bash
make lint
make format
```

**Step 2: Fix any lint errors**

**Step 3: Run dev server and manually test**

```bash
cd frontend && npm run dev
```

Test checklist:
- [ ] Navigate to `/statements/trash` -- page loads without errors
- [ ] Side panel shows "Trash" with item count badge
- [ ] No Google Drive / Dropbox widgets anywhere on page
- [ ] No stray `)` character
- [ ] Search bar filters items by file name
- [ ] Each item rendered as a card (rounded border, white bg, hover effect)
- [ ] Card style matches `/statements/submit` list items
- [ ] Checkbox selection works (individual + select all)
- [ ] Bulk actions bar appears when items selected
- [ ] Restore button works (item disappears, toast shown)
- [ ] Delete button shows confirm modal, then permanently deletes
- [ ] Empty Trash button shows confirm modal, then clears all
- [ ] Expiry badges show correct days remaining (green/amber/red)
- [ ] Pagination works (prev/next buttons, page counter)
- [ ] Empty state shows Trash icon + "Trash is empty" message
- [ ] Responsive on mobile (cards stack, no horizontal scroll)

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(trash): lint and polish trash page redesign"
```

---

## Summary of Changes

| What | Before | After |
|------|--------|-------|
| Component | `StoragePageContent` (3300 lines, shared) | `TrashListView` (~300 lines, dedicated) |
| Layout | `<table>` with 10 columns | Card-based flex rows (matching StatementsListItem) |
| Container | `container-shared px-4 py-8` | `container-shared flex h-[calc(100vh-...)] px-4 py-6` |
| Side panel | None (blank sidebar) | `TrashSidePanel` with Trash nav item + count badge |
| Cloud widgets | Google Drive + Dropbox shown | Removed entirely |
| Stray `)` bug | Visible on page | Gone (new component, no StoragePageContent) |
| Columns shown | File, Bank, Account, Size, Status, Category, Access, Deleted, Actions | Checkbox, Icon, Type, Deleted Date, Name+Bank, Restore/Delete |
| Search | Hidden | Own search bar (matching StatementsListView) |
| Dependency | `@/app/storage/StoragePageContent` | Fully self-contained in `statements` module |

## New Files Created

1. `frontend/app/(main)/statements/components/TrashListItem.tsx` -- single trash item card
2. `frontend/app/(main)/statements/components/TrashListView.tsx` -- main trash list view
3. `frontend/app/(main)/statements/components/TrashSidePanel.tsx` -- sidebar panel config

## Files Modified

1. `frontend/app/(main)/statements/trash/page.tsx` -- swap StoragePageContent for new components
2. `frontend/app/(main)/statements/page.content.ts` -- add trash i18n keys
