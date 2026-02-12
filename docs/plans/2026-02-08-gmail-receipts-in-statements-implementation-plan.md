# Gmail Receipts in Statements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** After Gmail connection, immediately sync receipts from email, create full `Statement` records, and show them on `/statements/submit` with the same UX as bank statements (PDF thumbnail, amount, and detailed View page with parsed line items).

**Architecture:** Reuse the existing statement pipeline instead of the legacy receipts UI flow. Gmail sync imports PDF attachments as `Statement` files with source metadata, then runs `StatementProcessingService` (plus a dedicated receipt parser profile) to generate transactions and totals. Frontend stays on the statements pages, with a small UX layer for Gmail source feedback.

**Tech Stack:** NestJS, TypeORM, Next.js 14, existing parsing module (`ParserFactoryService`, parsers), Gmail API integration, Jest.

---

### Task 1: Extend Statement schema for Gmail-origin documents

**Files:**
- Create: `backend/src/migrations/202602080001-add-gmail-source-to-statements.ts`
- Modify: `backend/src/entities/statement.entity.ts`
- Test: `backend/@tests/unit/modules/statements/statements.service.spec.ts`

**Step 1: Write the failing test**

Add/extend a unit test that creates a `Statement` with `source: 'gmail'` and `gmailMessageId`, expecting persistence and retrieval of these fields.

**Step 2: Run test to verify it fails**

Run: `cd backend && npm run test -- statements.service.spec.ts`
Expected: FAIL because fields do not exist in entity/schema.

**Step 3: Write minimal implementation**

- Add enum `StatementSource` with at least `UPLOAD` and `GMAIL`.
- Add nullable columns:
  - `source`
  - `gmail_message_id` (unique nullable)
  - `gmail_thread_id`
  - `email_subject`
  - `email_sender`
  - `email_received_at`
- Add DB migration creating columns + index/unique constraint.

**Step 4: Run test to verify it passes**

Run: `cd backend && npm run test -- statements.service.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/entities/statement.entity.ts backend/src/migrations/202602080001-add-gmail-source-to-statements.ts backend/@tests/unit/modules/statements/statements.service.spec.ts
git commit -m "feat(statements): add gmail source metadata to statement model"
```

### Task 2: Trigger first sync and redirect user to Statements right after OAuth callback

**Files:**
- Modify: `backend/src/modules/gmail/gmail.controller.ts`
- Modify: `backend/src/modules/gmail/services/gmail-oauth.service.ts`
- Test: `backend/@tests/unit/modules/gmail/gmail-controller-sync.spec.ts`

**Step 1: Write the failing test**

Add callback-flow test:
- when Gmail callback succeeds,
- `gmailSyncService.syncForUser()` is called,
- response redirects to `/statements/submit` with sync result params.

**Step 2: Run test to verify it fails**

Run: `cd backend && npm run test -- gmail-controller-sync.spec.ts`
Expected: FAIL because callback currently redirects to integration page and does not sync.

**Step 3: Write minimal implementation**

In `handleCallback()`:
- after `setupGmailEnvironment()` and `setupWatch()`, run `syncForUser(connectedByUserId)`;
- redirect to frontend `/statements/submit?source=gmail&synced=<count>`.
- on partial sync error, still redirect to statements with `synced=0` and optional error flag.

**Step 4: Run test to verify it passes**

Run: `cd backend && npm run test -- gmail-controller-sync.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/gmail/gmail.controller.ts backend/src/modules/gmail/services/gmail-oauth.service.ts backend/@tests/unit/modules/gmail/gmail-controller-sync.spec.ts
git commit -m "feat(gmail): sync receipts on connect and redirect to statements"
```

### Task 3: Import Gmail attachments as Statement files

**Files:**
- Create: `backend/src/modules/statements/services/gmail-statement-import.service.ts`
- Modify: `backend/src/modules/statements/statements.module.ts`
- Modify: `backend/src/modules/gmail/services/gmail-sync.service.ts`
- Modify: `backend/src/modules/gmail/gmail-receipt-processor.ts`
- Test: `backend/@tests/unit/modules/gmail/gmail-sync.service.spec.ts`

**Step 1: Write the failing test**

Add sync service test that expects for a Gmail message with PDF attachment:
- statement is created (not receipt-only record),
- `source === 'gmail'`,
- `gmailMessageId` is saved,
- parsing job/processing is scheduled.

**Step 2: Run test to verify it fails**

Run: `cd backend && npm run test -- gmail-sync.service.spec.ts`
Expected: FAIL because current flow creates only receipt processing jobs.

**Step 3: Write minimal implementation**

Implement service method:

```ts
async importMessageAsStatement(input: GmailMessageImportInput): Promise<Statement>
```

Behavior:
- download first supported attachment (`.pdf` priority);
- store file via existing statement storage path conventions;
- create statement with Gmail metadata fields;
- call `statementProcessingService.processStatement(statement.id)` asynchronously;
- idempotency by `gmailMessageId`.

Update sync/processor to use this service.

**Step 4: Run test to verify it passes**

Run: `cd backend && npm run test -- gmail-sync.service.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/statements/services/gmail-statement-import.service.ts backend/src/modules/statements/statements.module.ts backend/src/modules/gmail/services/gmail-sync.service.ts backend/src/modules/gmail/gmail-receipt-processor.ts backend/@tests/unit/modules/gmail/gmail-sync.service.spec.ts
git commit -m "feat(gmail): import email pdf attachments as statements"
```

### Task 4: Add receipt-oriented parser profile to produce statement transactions

**Files:**
- Create: `backend/src/modules/parsing/parsers/receipt.parser.ts`
- Modify: `backend/src/modules/parsing/services/parser-factory.service.ts`
- Modify: `backend/src/modules/parsing/parsing.module.ts`
- Modify: `backend/src/modules/parsing/interfaces/parsed-statement.interface.ts`
- Test: `backend/@tests/unit/modules/parsing/services/parser-factory.service.spec.ts`

**Step 1: Write the failing test**

Add parser factory tests that for Gmail receipt PDF:
- factory selects `ReceiptParser`,
- parser returns at least one transaction,
- total amount can be derived for statement totals.

**Step 2: Run test to verify it fails**

Run: `cd backend && npm run test -- parser-factory.service.spec.ts`
Expected: FAIL because `ReceiptParser` is not registered.

**Step 3: Write minimal implementation**

Implement parser strategy:
- extract text and tables via existing PDF utilities;
- parse total sum (`Итого`, `Total`, `Сумма`) and date;
- parse line items into transactions (`debit` per item);
- fallback: one synthetic transaction with receipt total when no items found;
- emit parsing metadata for UI visibility.

**Step 4: Run test to verify it passes**

Run: `cd backend && npm run test -- parser-factory.service.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/parsing/parsers/receipt.parser.ts backend/src/modules/parsing/services/parser-factory.service.ts backend/src/modules/parsing/parsing.module.ts backend/src/modules/parsing/interfaces/parsed-statement.interface.ts backend/@tests/unit/modules/parsing/services/parser-factory.service.spec.ts
git commit -m "feat(parsing): add receipt parser for gmail imported statements"
```

### Task 5: Ensure Amount and thumbnail parity in statements list

**Files:**
- Modify: `frontend/app/(main)/statements/components/StatementsListView.tsx`
- Modify: `frontend/app/(main)/statements/components/columns/statement-columns.ts`
- Test: `frontend/app/(main)/statements/components/StatementsListView.test.tsx` (new)

**Step 1: Write the failing test**

Create UI test for list row with `source: 'gmail'`:
- receipt PDF thumbnail renders through existing preview endpoint,
- `amount` cell shows formatted total debit,
- `View` button navigates to statement details.

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- StatementsListView.test.tsx`
Expected: FAIL before source handling/format updates.

**Step 3: Write minimal implementation**

- Reuse existing thumbnail/preview components for Gmail statements (no separate receipt card).
- Ensure amount formatter uses statement totals identically for all sources.
- Optional: add source badge/filter value `gmail` without changing core table layout.

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test -- StatementsListView.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/app/(main)/statements/components/StatementsListView.tsx frontend/app/(main)/statements/components/columns/statement-columns.ts frontend/app/(main)/statements/components/StatementsListView.test.tsx
git commit -m "feat(frontend): show gmail receipts as regular statement rows"
```

### Task 6: Show parsed receipt details on existing View/Edit statement page

**Files:**
- Modify: `frontend/app/(main)/statements/[id]/edit/page.tsx`
- Modify: `backend/src/modules/parsing/services/statement-processing.service.ts`
- Test: `backend/@tests/unit/test/statement-processing.service.spec.ts`

**Step 1: Write the failing test**

Add processing service test for a parsed receipt:
- transactions are persisted from line items,
- `totalDebit` equals receipt total,
- statement status transitions to parsed/validated path like normal statement.

**Step 2: Run test to verify it fails**

Run: `cd backend && npm run test -- statement-processing.service.spec.ts`
Expected: FAIL if receipt parser output is not normalized to statement transaction schema.

**Step 3: Write minimal implementation**

- Normalize receipt parser output to standard `ParsedTransaction` schema.
- Keep current edit page table and totals widgets unchanged.
- Add small conditional labels for Gmail-origin metadata (`sender`, `subject`) in info block.

**Step 4: Run test to verify it passes**

Run: `cd backend && npm run test -- statement-processing.service.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/parsing/services/statement-processing.service.ts backend/@tests/unit/test/statement-processing.service.spec.ts frontend/app/(main)/statements/[id]/edit/page.tsx
git commit -m "feat(statements): display parsed gmail receipt details in statement view"
```

### Task 7: Keep integrations page as settings-only and show sync feedback in statements

**Files:**
- Modify: `frontend/app/integrations/gmail/page.tsx`
- Modify: `frontend/app/(main)/statements/submit/page.tsx`
- Modify: `frontend/app/(main)/statements/components/StatementsSidePanel.tsx`

**Step 1: Write the failing test**

Add minimal routing/UI test or assertions for query params:
- when page opens with `?source=gmail&synced=N`, success toast/banner appears;
- side panel can show Gmail sync section/count.

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- statements`
Expected: FAIL because sync feedback is absent.

**Step 3: Write minimal implementation**

- Keep `/integrations/gmail` as connect/settings screen only.
- Add one-time sync feedback on `/statements/submit`.
- Add side panel subsection for Gmail imports (count + quick action link).

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test -- statements`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/app/integrations/gmail/page.tsx frontend/app/(main)/statements/submit/page.tsx frontend/app/(main)/statements/components/StatementsSidePanel.tsx
git commit -m "feat(statements): add gmail sync feedback in statements workflow"
```

### Task 8: Regression checks and rollout safety

**Files:**
- Modify: `docs/gmail-integration.md`
- Modify: `docs/statement-parsing-enterprise.md`

**Step 1: Write the failing check**

Define verification matrix for:
- normal statement upload,
- Gmail connect + initial sync,
- thumbnail preview,
- View page line-item details,
- amount column parity.

**Step 2: Run verification commands**

Run:
- `make test-backend`
- `make test-frontend`
- `make lint`

Expected: all green.

**Step 3: Write minimal implementation/docs**

Document new source model, callback behavior, and parser flow.

**Step 4: Re-run checks**

Run again:
- `make test-backend`
- `make test-frontend`
- `make lint`

Expected: PASS.

**Step 5: Commit**

```bash
git add docs/gmail-integration.md docs/statement-parsing-enterprise.md
git commit -m "docs(gmail): document statements-first receipt import flow"
```

## Data Migration Notes

- Keep legacy `receipts` table and old endpoints during transition.
- New imports write to `statements` only.
- Optional follow-up migration can backfill historic receipts into statements in batches using `gmail_message_id` idempotency.

## Definition of Done

- Connecting Gmail triggers immediate first sync.
- Imported checks appear directly on `/statements/submit`.
- Imported checks have PDF thumbnail and open in standard statement View/Edit.
- Amount column shows parsed total from check.
- View page shows parsed spending breakdown (line items/transactions).
- Existing bank statement flow is not regressed.

## Verification Checklist

- OAuth callback redirects to `/statements/submit`.
- At least one Gmail PDF is imported as `StatementSource.GMAIL`.
- `GET /statements` returns Gmail-imported rows mixed with uploaded statements.
- Thumbnail endpoint works for Gmail-imported PDFs.
- Statement details page shows totals and parsed transactions for Gmail records.
- Duplicate Gmail message does not create duplicate statement.
