# Manual Expense Attach File Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to upload a real receipt file when a manual expense was created without file, show that file in preview/thumbnail flow, and optionally start replace-mode parsing from the same UI flow.

**Architecture:** Add a backend endpoint to attach/replace the statement file for an existing statement and keep parsing as a separate explicit action. Extend `PDFPreviewModal` error state for manual-expense placeholders so it offers file upload and a parse confirmation dialog. Reuse existing `POST /statements/:id/reprocess?mode=replace` endpoint for parser launch.

**Tech Stack:** NestJS + TypeORM (backend), Next.js + React + Vitest (frontend), existing statement parsing/storage services.

---

### Task 1: Backend attach-file API (statement file replacement)

**Files:**
- Modify: `backend/src/modules/statements/statements.controller.ts`
- Modify: `backend/src/modules/statements/statements.service.ts`
- Test: `backend/@tests/unit/modules/statements/statements.manual-expense.controller.spec.ts`

**Step 1: Write the failing test**

Add a controller/service unit test for new `POST /statements/:id/attach-file` route that:
- accepts a file for an existing statement,
- updates statement file metadata (`fileName`, `filePath`, `fileType`, `fileSize`, `fileHash`, `fileData`),
- returns updated statement,
- rejects empty/missing file.

**Step 2: Run test to verify it fails**

Run: `cd backend && npm run test -- @tests/unit/modules/statements/statements.manual-expense.controller.spec.ts`

Expected: FAIL because route/service method does not exist yet.

**Step 3: Write minimal implementation**

Implement in controller:
- `POST ':id/attach-file'`
- `FileInterceptor('file', multerOptions)`
- `validateFile(file)`
- calls service `attachFile(id, file, req.user.userId)`

Implement in service:
- load statement with permission check,
- replace file metadata from uploaded file,
- compute `fileHash` using `calculateFileHash`,
- store `fileData` (best effort),
- remove old placeholder file from disk when safe,
- keep status as-is (no automatic parsing in this endpoint).

**Step 4: Run test to verify it passes**

Run: `cd backend && npm run test -- @tests/unit/modules/statements/statements.manual-expense.controller.spec.ts`

Expected: PASS.

### Task 2: Frontend modal upload fallback for manual placeholder errors

**Files:**
- Modify: `frontend/app/components/PDFPreviewModal.tsx`
- Modify: `frontend/app/(main)/statements/components/StatementsListView.tsx`
- Test: `frontend/app/components/PDFThumbnail.test.tsx`

**Step 1: Write the failing test**

Add/extend frontend test coverage for modal error state:
- when preview fails for manual expense placeholder, show upload CTA instead of only close action,
- selecting a file triggers attach endpoint,
- after success, callback for list refresh is fired.

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- app/components/PDFThumbnail.test.tsx`

Expected: FAIL because UI/handlers do not exist.

**Step 3: Write minimal implementation**

In `PDFPreviewModal`:
- add optional props like `allowAttachFile`, `onFileAttached`, `onParsingStarted`.
- in error state for attach-enabled mode show:
  - upload button (`file` input),
  - attach progress state.
- call `apiClient.post('/statements/:id/attach-file', formData)`.
- after success re-fetch preview content and invoke callback.

In `StatementsListView`:
- pass `allowAttachFile` only for manual-expense statements without user file,
- trigger list refresh callback after attach.

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test -- app/components/PDFThumbnail.test.tsx`

Expected: PASS.

### Task 3: Parse confirmation dialog after attach

**Files:**
- Modify: `frontend/app/components/PDFPreviewModal.tsx`
- Test: `frontend/app/components/PDFThumbnail.test.tsx`

**Step 1: Write the failing test**

Add test scenario:
- after successful file attach, show confirmation dialog with two actions:
  - reject parsing,
  - start parsing.
- start parsing path must call `POST /statements/:id/reprocess?mode=replace`.

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- app/components/PDFThumbnail.test.tsx`

Expected: FAIL.

**Step 3: Write minimal implementation**

In modal:
- open confirmation dialog immediately after attach success,
- “Отказаться” closes dialog and keeps attached file,
- “Запустить парсинг” triggers reprocess endpoint in replace mode,
- show loading state and success/error toast,
- keep attached file visible even when parsing is declined.

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test -- app/components/PDFThumbnail.test.tsx`

Expected: PASS.

### Task 4: Regression verification for statements list flow

**Files:**
- Modify: `frontend/app/(main)/statements/components/StatementsListView.tsx`
- Test: `frontend/app/(main)/statements/components/StatementsSidePanel.test.tsx` (run as regression)

**Step 1: Write/adjust failing test if needed**

Ensure new modal props do not break existing list preview flow and FAB behavior.

**Step 2: Run test to verify behavior**

Run:
- `cd frontend && npm run test -- "app/(main)/statements/components/StatementsSidePanel.test.tsx"`
- `cd frontend && npm run test -- "app/(main)/statements/components/StatementsCircularUploadMenu.test.tsx"`

Expected: PASS for existing flows.

**Step 3: Final verification**

Run:
- `cd backend && npm run test -- @tests/unit/modules/statements/statements.manual-expense.controller.spec.ts`
- `cd frontend && npm run test -- app/components/PDFThumbnail.test.tsx`
- `cd frontend && npm run test -- "app/(main)/statements/components/StatementsSidePanel.test.tsx"`

Expected: all green.
