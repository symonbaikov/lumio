# Statement Autosave and Categories Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable automatic saving on statement details edit page and redesign categories page with a fixed global default category set for all workspaces/users.

**Architecture:** Replace manual metadata save with debounced autosave on statement edit screen, preserve existing transaction save flow, and remove the blue save button. Extend category domain with `isEnabled`, replace legacy system categories with the requested English defaults for every workspace via migration, and update categories UI to match the provided reference (using project color tokens).

**Tech Stack:** Next.js 14, React hooks, Material UI, NestJS, TypeORM, PostgreSQL migrations, Jest.

---

## Task 1: Statement metadata autosave (remove manual save button)

**Files:**
- Create: `frontend/app/hooks/useAutoSave.ts`
- Modify: `frontend/app/(main)/statements/[id]/edit/page.tsx`
- Test: `frontend/app/hooks/__tests__/useAutoSave.test.tsx` (or repo test location for hooks)

**Step 1: Write the failing test**

Create hook tests for:
- Debounced save triggers after 500ms when form data changes
- Initial render does not trigger save
- Cleanup cancels pending save

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- useAutoSave`
Expected: FAIL because hook does not exist yet

**Step 3: Write minimal implementation**

Implement `useAutoSave` with:
- Generic `data` + async `onSave`
- Configurable `debounceMs` default `500`
- `enabled` guard
- Timer cleanup

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- useAutoSave`
Expected: PASS

**Step 5: Integrate hook into statement edit page**

In `page.tsx`:
- Add `performAutoSave` callback that patches `/statements/:id`
- Attach `useAutoSave({ data: metadataForm, onSave: performAutoSave, debounceMs: 500 })`
- Keep silent save behavior (no extra indicator)
- Remove blue `Save statement data` button block

**Step 6: Run statement page tests/build**

Run: `cd frontend && npm run build`
Expected: PASS

---

## Task 2: Add category enabled flag

**Files:**
- Modify: `backend/src/entities/category.entity.ts`
- Modify: `backend/src/modules/categories/dto/create-category.dto.ts`
- Modify: `backend/src/modules/categories/dto/update-category.dto.ts`
- Create: `backend/src/migrations/1762010000000-AddCategoryIsEnabled.ts`
- Test: `backend/@tests/unit/modules/categories/categories.service.spec.ts` (or existing categories tests)

**Step 1: Write the failing test**

Add/extend tests to assert:
- New categories default to enabled
- Update accepts `isEnabled`

**Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- categories`
Expected: FAIL because `isEnabled` not supported

**Step 3: Write minimal implementation**

- Add `isEnabled` column (`is_enabled`, default `true`) to entity
- Extend create/update DTOs with optional boolean `isEnabled`
- Ensure service create/update persist field

**Step 4: Add migration**

Create migration adding `is_enabled boolean not null default true`.

**Step 5: Run tests and migration check**

Run:
- `cd backend && npm test -- categories`
- `cd backend && npm run build`
Expected: PASS

---

## Task 3: Replace system categories globally

**Files:**
- Modify: `backend/src/modules/categories/categories.service.ts`
- Create: `backend/src/migrations/1762010000001-ReplaceSystemCategoriesWithEnglishDefaults.ts`
- Test: `backend/@tests/unit/modules/categories/categories.service.spec.ts`

**Step 1: Write the failing test**

Add test for `createSystemCategories` expecting exactly:
- Income: `Sales`, `Services`, `Interest Income`, `Other Income`
- Expense: `Advertising`, `Benefits`, `Car`, `Equipment`, `Fees`, `Home Office`, `Insurance`, `Interest`, `Labor`, `Maintenance`, `Materials`, `Meals and Entertainment`, `Office Supplies`, `Other`, `Professional Services`, `Rent`, `Taxes`, `Travel`, `Utilities`

**Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- categories.service`
Expected: FAIL with old Russian defaults

**Step 3: Write minimal implementation**

Update system category seed list in `createSystemCategories` to new English defaults.

**Step 4: Add data migration for existing workspaces**

Migration behavior:
- For each workspace, remove legacy system categories (as requested: replace all)
- Recreate required default set with `is_system=true`, `is_enabled=true`
- Keep non-system categories unchanged

**Step 5: Run tests/build**

Run:
- `cd backend && npm test -- categories`
- `cd backend && npm run build`
Expected: PASS

---

## Task 4: Redesign categories page UI to reference layout

**Files:**
- Modify: `frontend/app/categories/page.tsx`
- Modify: `frontend/app/categories/page.content.ts`
- Test: `frontend/app/categories/page.test.tsx` (if test coverage exists for page interactions)

**Step 1: Write the failing test**

Add UI test(s) for:
- Row renders name + enabled switch + chevron
- Icon block and inline edit/delete buttons are absent
- Toggling switch sends update and updates UI state

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- categories/page`
Expected: FAIL with current layout

**Step 3: Write minimal implementation**

Update page to match screenshot structure:
- Keep header/search/actions positioning
- Table-like list rows with alternating subtle backgrounds in project palette
- Remove row icons
- Remove inline edit/delete buttons
- Keep row click open edit dialog (chevron affordance)
- Add functional enabled toggle bound to `isEnabled`

**Step 4: Run tests/build**

Run:
- `cd frontend && npm test -- categories`
- `cd frontend && npm run build`
Expected: PASS

---

## Task 5: Verification and rollout checks

**Files:**
- Modify (if needed): docs references for category defaults

**Step 1: Run full verification**

Run:
- `make test-backend`
- `make test-frontend`
- `make lint`

**Step 2: Manual validation checklist**

- Statement edit page autosaves dates and balances after 500ms
- Blue save button is removed
- No noisy save indicator appears
- Categories page layout matches reference structure
- Toggle enable/disable persists
- Every workspace has the new default category set

**Step 3: Prepare incremental commits**

Recommended commit sequence:
1. `feat(statements): add debounced autosave for metadata`
2. `feat(categories): add enabled flag support`
3. `feat(categories): replace system defaults with english set`
4. `feat(categories): redesign list layout and toggle behavior`
5. `test(categories): cover default seed and toggle flow`
