# AI Auto-Categorization Implementation Plan

## Confirmed Decisions

- Confidence threshold: `0.9`
- AI categorization behavior: auto-apply silently
- Submit blocking: hard block (submit button disabled when uncategorized transactions exist)
- Execution point: during initial parsing (synchronous)
- Learning scope: workspace-wide (`workspaceId` on learning records)
- AI failure behavior: silent fallback to `Без категории`
- AI request strategy: classify in batches (multiple transactions per prompt)

## Goals

1. Auto-assign categories to statement transactions using existing rules/patterns plus Gemini AI for unresolved cases.
2. Keep uncategorized transactions visible and actionable in UI.
3. Prevent statement submission until all transactions have categories.
4. Learn from accepted AI categorization at workspace scope.

## Architecture

### Existing Flow (Current)

1. Parse statement into transactions.
2. For each transaction, run `ClassificationService.classifyTransaction(...)`.
3. Save transaction.
4. Fallback category can become `Без категории`.

### Target Flow

1. Parse + deduplicate transactions.
2. Build AI input set for unresolved/low-signal transactions.
3. Run Gemini categorization in batches (by transaction type where needed).
4. Merge AI matches into per-transaction classification before save.
5. Save transactions.
6. Block submit action on frontend while `missingCategoryCount > 0`.
7. Store AI matches into workspace-scoped learning records.

## Implementation Phases

## Phase 1: Data Model and Migration

### 1.1 Add workspace scope to learning

Update `backend/src/entities/category-learning.entity.ts`:

- Add nullable `workspaceId` column with index.
- Keep current `userId` for backward compatibility during transition.
- Extend `learnedFrom` enum with `ai_classification`.

### 1.2 Create migration

Create `backend/src/migrations/1763000000000-AddWorkspaceIdToCategoryLearning.ts`:

- Add `workspace_id` to `category_learning`.
- Add indexes:
  - `workspace_id`
  - composite `(workspace_id, category_id)`
- Add FK to `workspaces(id)` with `ON DELETE CASCADE`.
- Add enum value `ai_classification` to `category_learning_learnedfrom_enum`.

## Phase 2: Batched AI Classifier Helper

### 2.1 New helper

Create `backend/src/modules/classification/helpers/ai-category-classifier.helper.ts`.

Responsibilities:

- Reuse existing AI runtime protections from parsing module:
  - circuit breaker
  - concurrency semaphore
  - timeout + retry
  - sensitive text redaction
- Classify multiple transactions in one prompt.
- Accept only matches with confidence `>= 0.9`.
- Ignore suggestions not in provided category list.

### 2.2 Prompt contract

Input:

- Transaction list: `index`, `counterpartyName`, `paymentPurpose`.
- Allowed category names.

Output JSON shape:

```json
{
  "classifications": [
    { "index": 0, "category": "Exact Category Name", "confidence": 0.95 }
  ]
}
```

Validation:

- `index` must map to known transaction.
- `category` must exist in available categories.
- `confidence >= 0.9`.

### 2.3 Batch sizing

- Default batch size: `20` transactions per call.
- For large statements: loop through chunks.
- If one chunk fails, only that chunk falls back to uncategorized behavior.

## Phase 3: Classification Service Integration

### 3.1 Extend module dependencies

Update `backend/src/modules/classification/classification.module.ts`:

- Import `CategoriesModule` so `CategoriesService` can be used by classification flow.

### 3.2 Add batch-level classification API

In `backend/src/modules/classification/services/classification.service.ts`, add method:

- `classifyTransactionsBatch(...)` returning `Map<transactionIndex, categoryId>`.
- Split transactions by type (`INCOME`/`EXPENSE`) so AI receives only relevant category set.
- Use workspace categories from `CategoriesService.findAll(workspaceId, type)`.
- Exclude disabled categories and `Без категории` from AI candidate list.

### 3.3 Learning write path

Add workspace-scoped learning persistence:

- Upsert-like behavior on same `(workspaceId, paymentPurpose, counterpartyName)`.
- Increase `occurrences`, smooth confidence.
- Write `learnedFrom: ai_classification`.
- Non-blocking error handling (never fail import because learning insert failed).

### 3.4 Keep fallback chain intact

Order remains:

1. user rules
2. system templates/patterns
3. learned patterns/history
4. AI batch result
5. `Без категории` fallback

## Phase 4: Parsing Pipeline Hook

Update `backend/src/modules/parsing/services/statement-processing.service.ts`.

### 4.1 Precompute AI classification before save loop

- After deduplication, prepare normalized transaction descriptors with source index.
- Call `classificationService.classifyTransactionsBatch(...)` once per statement (chunked internally).

### 4.2 Merge with existing per-transaction classify

Inside current creation loop:

- Keep existing `classifyTransaction(...)` call.
- If no category from existing logic, apply AI category by index from map.
- If still missing, keep current fallback behavior.

### 4.3 Logging

Add import log metrics:

- total transactions
- AI-attempted
- AI-matched (>= 0.9)
- AI-fallback count

## Phase 5: Frontend Hard Submit Blocking

Update `frontend/app/(main)/statements/[id]/edit/page.tsx`.

### 5.1 Disable submit action

- For stage action `submitForApproval`, disable button when `missingCategoryCount > 0`.
- Keep other stage actions unchanged.

### 5.2 Tooltip/message

- Add tooltip explaining why submit is disabled.
- Use existing warning chip count for visibility.

### 5.3 Copy updates

Update `frontend/app/(main)/statements/[id]/edit/page.content.ts`:

- Add localized label for disabled submit tooltip.

## Phase 6: Tests

### 6.1 Backend tests

Create `backend/@tests/unit/modules/classification/ai-category-classifier.spec.ts`.

Cover:

- low confidence rejection (`< 0.9`)
- category not in allowlist rejected
- malformed/empty AI response fallback
- batch chunking behavior
- circuit-open behavior

Extend existing classification service tests to verify:

- AI map applied only when non-AI path has no category
- silent fallback on AI error
- workspace-scoped learning writes

### 6.2 Frontend tests

Create `frontend/app/(main)/statements/[id]/edit/__tests__/submit-blocking.test.tsx`.

Cover:

- submit enabled when all categorized
- submit disabled when uncategorized exist
- tooltip text shown

## Files to Add / Modify

### New

- `docs/plans/2026-02-07-ai-auto-categorization-implementation-plan.md`
- `backend/src/migrations/1763000000000-AddWorkspaceIdToCategoryLearning.ts`
- `backend/src/modules/classification/helpers/ai-category-classifier.helper.ts`
- `backend/@tests/unit/modules/classification/ai-category-classifier.spec.ts`
- `frontend/app/(main)/statements/[id]/edit/__tests__/submit-blocking.test.tsx`

### Modified

- `backend/src/entities/category-learning.entity.ts`
- `backend/src/modules/classification/classification.module.ts`
- `backend/src/modules/classification/services/classification.service.ts`
- `backend/src/modules/parsing/services/statement-processing.service.ts`
- `frontend/app/(main)/statements/[id]/edit/page.tsx`
- `frontend/app/(main)/statements/[id]/edit/page.content.ts`

## Verification Checklist

1. Run backend migration successfully.
2. Run backend tests (`classification`, `parsing` affected suites).
3. Run frontend tests for statement edit page.
4. Validate manual flow:
   - import statement
   - verify high-confidence AI categories auto-applied
   - verify uncategorized remain visible
   - verify submit button disabled until zero uncategorized
5. Confirm no blocking behavior on AI timeouts/errors (fallback path works).

## Rollout and Safety

- Keep behavior backward-compatible: if AI unavailable, existing classification still works.
- Log AI classification rates for tuning batch size and confidence threshold later.
- Future optimization: cache category list per workspace within import run to reduce DB queries.
