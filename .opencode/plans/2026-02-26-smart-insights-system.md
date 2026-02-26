# Smart Insights (Умные подсказки) — Implementation Plan

**Date:** 2026-02-26  
**Status:** Planned  
**Estimated effort:** 30-40 hours

## Overview

A smart tips system that analyzes user behavior, spending patterns, and operational state to generate actionable insights. Delivered through the existing notification system with enhanced action buttons.

### Examples
- "You often categorize Kaspi as Fees. Apply a rule?"
- "This month expenses grew by 34%"
- "There are 64 unapproved transactions"
- "Transport spending has been rising for 3 months straight"
- "Try AI classification for 45 uncategorized transactions"

---

## Architecture

```
Frontend (NotificationDropdown + action buttons)
           |
           | socket.io + REST
           v
Notifications Module (existing, extended with new types)
           ^
           | EventEmitter events
           |
Insights Module (NEW)
  |
  +-- InsightsScheduler (cron-based heavy analytics)
  +-- InsightsListener (event-driven real-time)
  |
  +-- InsightsService (orchestrator)
       |
       +-- Analyzers (Strategy pattern)
            - PatternAnalyzer
            - AnomalyAnalyzer
            - OperationalAnalyzer
            - TrendAnalyzer
            - WorkflowAnalyzer
  |
  +-- Insight Entity (DB persistence + dedup + actions)
```

**Generation mode:** Hybrid
- Heavy analytics (trends, anomalies, patterns) via cron (daily/weekly)
- Lightweight operational checks (unapproved count, uncategorized) via events + frequent cron
- Real-time reactive insights (new counterparty, unusual transaction) via event listeners

**Delivery:** Through existing notification system (NotificationDropdown)

---

## Phase 1: Database & Foundation

### 1.1 New Entity: `Insight`

**File:** `backend/src/entities/insight.entity.ts`

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID PK | Auto-generated |
| `userId` | UUID FK -> users | Owner |
| `workspaceId` | UUID FK -> workspaces, nullable | Workspace scope |
| `type` | enum InsightType | Specific insight type (15 values) |
| `category` | enum InsightCategory | `pattern` / `anomaly` / `operational` / `trend` / `workflow` |
| `severity` | enum | `info` / `warn` / `critical` |
| `title` | varchar(255) | Headline |
| `message` | text | Full description |
| `data` | JSONB | Contextual data for actions |
| `actions` | JSONB | Array of `{type, label, payload}` |
| `isDismissed` | boolean, default false | User dismissed |
| `isActioned` | boolean, default false | User took action |
| `expiresAt` | timestamp, nullable | Auto-expire stale insights |
| `deduplicationKey` | varchar(255) | Prevent duplicates per user |
| `createdAt` / `updatedAt` | timestamp | Timestamps |

### 1.2 InsightType Enum (15 types)

| Type | Category | Generation | Example Message |
|------|----------|------------|-----------------|
| `RULE_SUGGESTION` | pattern | event | "You assigned Kaspi to Fees 5 times. Create a rule?" |
| `PATTERN_DETECTED` | pattern | cron | "Pattern detected: payments from 'TOO Arman' -> Office" |
| `SPENDING_SPIKE` | anomaly | cron | "Expenses grew 34% vs last month" |
| `UNUSUAL_TRANSACTION` | anomaly | event | "Unusually large transaction: 2.5M KZT from new counterparty" |
| `NEW_COUNTERPARTY` | anomaly | event | "New counterparty: TOO 'XYZ' - first transaction" |
| `CATEGORY_DOMINANCE` | anomaly | cron | "Category 'Fees' is 45% of total expenses" |
| `UNAPPROVED_COUNT` | operational | event+cron | "64 unapproved transactions" |
| `UNCATEGORIZED_COUNT` | operational | event+cron | "12 transactions without a category" |
| `DUPLICATE_DETECTED` | operational | event | "3 potential duplicates detected" |
| `SPENDING_TREND_UP` | trend | cron | "Transport spending rising for 3 months" |
| `SPENDING_TREND_DOWN` | trend | cron | "Office spending declining - positive trend" |
| `MONTHLY_FORECAST` | trend | cron | "Forecast: ~4.2M KZT by month end" |
| `UNUSED_RULES` | workflow | cron | "Rule 'Kaspi Gold' hasn't matched in 30 days" |
| `CLASSIFICATION_ACCURACY` | workflow | cron | "87% of transactions auto-classified" |
| `WORKFLOW_TIP` | workflow | cron | "Try AI classification for 45 uncategorized transactions" |

### 1.3 Database Migration

```sql
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  type VARCHAR(64) NOT NULL,
  category VARCHAR(32) NOT NULL,
  severity VARCHAR(16) NOT NULL DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  actions JSONB,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  is_actioned BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  deduplication_key VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_insights_dedup 
  ON insights (user_id, deduplication_key) 
  WHERE is_dismissed = false AND deduplication_key IS NOT NULL;

CREATE INDEX idx_insights_user_active 
  ON insights (user_id, is_dismissed, created_at DESC);

CREATE INDEX idx_insights_expiry 
  ON insights (expires_at) 
  WHERE expires_at IS NOT NULL AND is_dismissed = false;

-- Extend notification_preferences
ALTER TABLE notification_preferences 
  ADD COLUMN smart_insights BOOLEAN NOT NULL DEFAULT true;
```

---

## Phase 2: Backend Module

### 2.1 Module Structure

```
backend/src/modules/insights/
  insights.module.ts
  insights.controller.ts          # REST API
  insights.service.ts             # Orchestrator + CRUD
  insights.scheduler.ts           # Cron jobs
  insights.listener.ts            # Event-driven generation
  dto/
    dismiss-insight.dto.ts
    action-insight.dto.ts
  analyzers/
    analyzer.interface.ts          # Common interface
    pattern.analyzer.ts            # Categorization rule suggestions
    anomaly.analyzer.ts            # Spending anomalies
    operational.analyzer.ts        # Operational reminders
    trend.analyzer.ts              # Trends & forecasts
    workflow.analyzer.ts           # Workflow optimization
```

### 2.2 Analyzer Interface

```typescript
interface InsightAnalyzer {
  analyze(context: AnalysisContext): Promise<InsightCandidate[]>;
}

interface AnalysisContext {
  userId: string;
  workspaceId: string | null;
  // Pre-fetched data to avoid N+1 queries
  transactions?: Transaction[];
  monthlyReport?: MonthlyReport;
  learnings?: CategoryLearning[];
  rules?: CategorizationRule[];
}

interface InsightCandidate {
  type: InsightType;
  category: InsightCategory;
  severity: 'info' | 'warn' | 'critical';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  actions?: InsightAction[];
  expiresAt?: Date;
  deduplicationKey: string;
}

interface InsightAction {
  type: 'CREATE_RULE' | 'GO_TO_UNAPPROVED' | 'RUN_AI_CLASSIFICATION' | 'VIEW_REPORT' | 'DISMISS';
  label: string;
  payload?: Record<string, unknown>;
}
```

### 2.3 Analyzer Logic Details

#### PatternAnalyzer (Categorization Rule Suggestions)

**Input:** `category_learning` + `categorization_rules` tables

**Logic:**
1. Query `category_learning` WHERE `occurrences >= 3` AND `learnedFrom = 'manual_correction'`
2. For each found pattern, check that no active `categorization_rule` already covers the same `counterpartyName`
3. Generate RULE_SUGGESTION insight with action to create the rule
4. `deduplicationKey: rule-suggestion:{counterpartyName}:{categoryId}`

**SQL:**
```sql
SELECT cl.*, c.name as category_name
FROM category_learning cl
JOIN categories c ON c.id = cl.category_id
WHERE cl.user_id = :userId
  AND cl.occurrences >= 3
  AND cl.learned_from = 'manual_correction'
  AND cl.category_id NOT IN (
    SELECT (cr.result->>'categoryId')::uuid
    FROM categorization_rules cr
    WHERE cr.user_id = :userId AND cr.is_active = true
    AND cr.conditions @> '[{"field": "counterparty_name"}]'
  )
```

#### AnomalyAnalyzer (Spending Anomalies)

**Input:** `ReportsService.generateMonthlyReport()`

**Logic:**
1. **SPENDING_SPIKE:** If `|expenseChangePercent| > 20%` -> warn; `> 50%` -> critical
2. **UNUSUAL_TRANSACTION:** For new transactions, compute Z-score = `(amount - mean) / stddev` per category over 90 days. If Z-score > 2.5 -> insight
3. **NEW_COUNTERPARTY:** First transaction from a `counterpartyName` not seen before
4. **CATEGORY_DOMINANCE:** If one category > 40% of total expenses
5. `deduplicationKey: spending-spike:{year}-{month}`, `category-dominance:{categoryId}:{month}`

#### OperationalAnalyzer (Operational Reminders)

**Input:** Direct SQL queries (lightweight)

**Logic:**
1. **UNAPPROVED_COUNT:** `COUNT(*) WHERE isVerified = false` (via statement -> user join). Generate if count > 0. Expire after 2 hours (regenerated by next cron).
2. **UNCATEGORIZED_COUNT:** `COUNT(*) WHERE categoryId IS NULL OR category.name = 'Uncategorized'`. Generate if count > 5.
3. **DUPLICATE_DETECTED:** `COUNT(*) WHERE isDuplicate = true AND duplicateOfId IS NOT NULL`. Generate if count > 0.

**This is the quickest-win analyzer** -- immediately visible results with minimal logic.

#### TrendAnalyzer (Trends & Forecasts)

**Input:** `ReportsService.getSpendOverTimeReport()` over 6 months, per category

**Logic:**
1. **SPENDING_TREND_UP/DOWN:** For each category with >= 3 months of data:
   - Compute linear regression (least squares) on monthly sums
   - If `|slope| > 10% of mean` AND `R^2 > 0.7` -> significant trend
   - `slope > 0` -> TREND_UP, `slope < 0` -> TREND_DOWN
2. **MONTHLY_FORECAST:**
   - Average daily expense = `total_expense / days_elapsed` in current month
   - Forecast = `avg_daily * days_in_month`
   - Compare with previous month total
   - "Forecast: ~{forecast} KZT. That's {diff}% {more/less} than last month"

#### WorkflowAnalyzer (Workflow Optimization)

**Input:** `categorization_rules` + `category_learning` + transaction counts

**Logic:**
1. **UNUSED_RULES:** `categorization_rules WHERE lastMatchedAt < NOW() - 30 days OR matchCount = 0`
   - **Prerequisite:** Fix `matchCount`/`lastMatchedAt` in ClassificationService (currently dead fields)
2. **CLASSIFICATION_ACCURACY:** `classified / total * 100` where classified = transactions with valid category
3. **WORKFLOW_TIP:** If `uncategorized_count > 10` AND no AI classification ran in last 7 days -> suggest AI

---

## Phase 3: Scheduling & Events

### 3.1 Cron Schedule

| Job | Schedule | Analyzers |
|-----|----------|-----------|
| Heavy analytics | `0 4 * * *` (4 AM daily) | TrendAnalyzer, AnomalyAnalyzer (spending_spike, category_dominance) |
| Operational check | `0 */2 * * *` (every 2 hours) | OperationalAnalyzer (unapproved, uncategorized, duplicates) |
| Pattern detection | `0 5 * * 1` (Monday 5 AM) | PatternAnalyzer, WorkflowAnalyzer |
| Cleanup expired | `0 3 * * *` (3 AM) | Delete expired insights |

### 3.2 Event-Driven Insights (Real-time)

| Event | Insight | Condition |
|-------|---------|-----------|
| `import.committed` | UNCATEGORIZED_COUNT | If uncategorized transactions exist after import |
| `import.committed` | NEW_COUNTERPARTY | If new counterparties appeared |
| `import.committed` | UNUSUAL_TRANSACTION | If any transaction > 3 sigma from category mean |
| Transaction update (manual category change) | RULE_SUGGESTION | If this is the 3rd+ time for the same counterparty+category pair |

### 3.3 Fix `matchCount` / `lastMatchedAt`

In `ClassificationService.classifyTransaction()`, when a user rule matches, update:
```typescript
await this.categorizationRuleRepo.update(rule.id, {
  matchCount: () => 'match_count + 1',
  lastMatchedAt: new Date(),
});
```

This enables WorkflowAnalyzer.UNUSED_RULES detection.

---

## Phase 4: REST API

| Method | Path | Description |
|--------|------|-------------|
| `GET /insights` | Query: `workspaceId?`, `category?`, `limit`, `offset` | Active (non-dismissed) insights |
| `GET /insights/summary` | Query: `workspaceId?` | `{total, byCategory: {pattern: N, anomaly: N, ...}}` |
| `POST /insights/:id/dismiss` | | Dismiss a single insight |
| `POST /insights/:id/action` | Body: `{actionType}` | Execute an action from the insight |
| `POST /insights/dismiss-all` | Query: `category?` | Dismiss all by category |
| `POST /insights/refresh` | | Force regeneration |

---

## Phase 5: Notification System Integration

### 5.1 New NotificationType Values

Add to `NotificationType` enum in `notification.entity.ts`:
- `INSIGHT_PATTERN = 'insight.pattern'`
- `INSIGHT_ANOMALY = 'insight.anomaly'`
- `INSIGHT_OPERATIONAL = 'insight.operational'`
- `INSIGHT_TREND = 'insight.trend'`
- `INSIGHT_WORKFLOW = 'insight.workflow'`

### 5.2 New Notification Preference

Add `smartInsights: boolean` (default true) to `notification-preference.entity.ts`.

Add mapping in `NOTIFICATION_PREFERENCE_MAP`:
```typescript
[NotificationType.INSIGHT_PATTERN]: 'smartInsights',
[NotificationType.INSIGHT_ANOMALY]: 'smartInsights',
[NotificationType.INSIGHT_OPERATIONAL]: 'smartInsights',
[NotificationType.INSIGHT_TREND]: 'smartInsights',
[NotificationType.INSIGHT_WORKFLOW]: 'smartInsights',
```

### 5.3 Flow

1. Insight created -> `eventEmitter.emit('insight.{category}', { insightId, userId, ... })`
2. `NotificationEventsListener` creates Notification with `meta: { insightId, actions: [...] }`
3. WebSocket pushes to `user:{userId}` room
4. Frontend renders in NotificationDropdown with action buttons

---

## Phase 6: Frontend

### 6.1 Extend NotificationDropdown

**New routing in `getNotificationHref()`:**
- `insight.pattern` -> `null` (action inline)
- `insight.anomaly` -> `/reports`
- `insight.operational` -> `/statements` (Unapproved Cash section)
- `insight.trend` -> `/reports`
- `insight.workflow` -> `/transactions`

**Action buttons** rendered when `meta.actions` is present:

```tsx
{item.meta?.actions?.map(action => (
  <Button 
    size="sm" 
    variant="flat" 
    color="primary"
    onClick={() => handleInsightAction(item.id, action)}
  >
    {action.label}
  </Button>
))}
```

### 6.2 Action Handlers

| `action.type` | UI Button | Backend Call |
|----------------|-----------|-------------|
| `CREATE_RULE` | "Apply Rule" | `POST /categorization-rules` with payload |
| `GO_TO_UNAPPROVED` | "Review" | Navigate to `/statements` (Unapproved Cash) |
| `RUN_AI_CLASSIFICATION` | "Run AI" | `POST /classification/bulk` |
| `VIEW_REPORT` | "View Report" | Navigate to `/reports` with filters |
| `DISMISS` | "Dismiss" | `POST /insights/:id/dismiss` |

### 6.3 Visual Differentiation

Insight notifications are visually distinct from regular notifications:
- **Category icons** (lucide-react): `Lightbulb` (pattern), `BarChart3` (anomaly), `AlertCircle` (operational), `TrendingUp` (trend), `Settings2` (workflow)
- **Left color band** by severity: blue (info), amber (warn), red (critical)
- **"Smart" badge** to distinguish from regular notifications

### 6.4 Notification Settings

On `/settings/notifications` page, add new section:
```
Smart Insights
  [toggle] Receive smart tips and recommendations
```

---

## Phase 7: i18n

All insight messages support 3 languages (ru/en/kk) via the existing `intlayer` system.

**Approach:** Backend generates the text in user's locale (`user.locale`), using server-side message templates with variable interpolation.

Example template:
```typescript
const templates = {
  'insight.rule_suggestion': {
    ru: 'Вы {count} раз относили "{counterpartyName}" к "{categoryName}". Создать правило?',
    en: 'You assigned "{counterpartyName}" to "{categoryName}" {count} times. Create a rule?',
    kk: '"{counterpartyName}" "{categoryName}" санатына {count} рет жатқыздыңыз. Ереже жасау керек пе?',
  }
};
```

---

## Phase 8: Testing

| What | How |
|------|-----|
| Analyzer unit tests | Mock repositories, verify thresholds (Z-score, R-squared, percentages) |
| Service unit tests | Verify deduplication, expiry, action execution |
| Cron integration test | Create test data, run scheduler, verify insights created |
| E2E API tests | GET /insights, POST /dismiss, POST /action |
| Frontend tests | Render action buttons, click handlers, visual differentiation |

---

## Implementation Order

| # | Task | Dependencies | Estimate |
|---|------|-------------|----------|
| 1 | Entity + migration | -- | 1-2h |
| 2 | InsightsModule scaffold (module, service, controller) | 1 | 2-3h |
| 3 | OperationalAnalyzer (quickest win, immediate visible result) | 2 | 2-3h |
| 4 | NotificationType integration + preferences | 2 | 2h |
| 5 | Frontend: action buttons in NotificationDropdown | 4 | 3-4h |
| 6 | PatternAnalyzer + CREATE_RULE action handler | 2, 5 | 3-4h |
| 7 | AnomalyAnalyzer | 2 | 3-4h |
| 8 | Fix matchCount/lastMatchedAt in ClassificationService | -- | 30min |
| 9 | TrendAnalyzer (linear regression) | 2 | 3-4h |
| 10 | WorkflowAnalyzer | 2, 8 | 2-3h |
| 11 | InsightsScheduler (cron jobs) | 3,6,7,9,10 | 2h |
| 12 | InsightsListener (event-driven) | 2 | 2h |
| 13 | i18n (ru/en/kk templates) | all analyzers | 2-3h |
| 14 | Tests | all | 4-6h |

**Total: ~30-40 hours**

---

## Key Design Decisions

1. **Insights are stored separately from notifications.** The `insights` table is the source of truth; notifications are ephemeral delivery. This allows insights to be dismissed, actioned, expired, and deduplicated independently.

2. **Deduplication via `deduplication_key` unique index.** Prevents the same insight from being created twice (e.g., "64 unapproved" doesn't repeat every 2 hours if the count hasn't changed). The key is scoped per user and only enforced on non-dismissed insights.

3. **Actions are data, not code.** The `actions` JSONB field contains structured action descriptors. The frontend interprets them and calls the appropriate API. This keeps the insight system decoupled from specific features.

4. **Leveraging existing infrastructure:**
   - `category_learning.occurrences` -> pattern detection (already tracked)
   - `ReportsService.generateMonthlyReport().comparison` -> spending spike detection (already computed)
   - Notification WebSocket -> real-time delivery (already built)
   - `@nestjs/schedule` -> cron scheduling (already installed)

5. **Graceful degradation.** If the insights cron fails, the system still works -- operational insights are also event-driven, and the notification dropdown shows whatever is available.

---

## Existing Code to Modify

| File | Change |
|------|--------|
| `backend/src/entities/notification.entity.ts` | Add 5 new enum values to `NotificationType` |
| `backend/src/entities/notification-preference.entity.ts` | Add `smartInsights` column |
| `backend/src/modules/notifications/notifications.service.ts` | Add preference mapping for new types |
| `backend/src/modules/notifications/notification-events.listener.ts` | Add handlers for `insight.*` events |
| `backend/src/modules/notifications/dto/update-notification-preferences.dto.ts` | Add `smartInsights` field |
| `backend/src/modules/classification/services/classification.service.ts` | Fix `matchCount`/`lastMatchedAt` update |
| `backend/src/app.module.ts` | Import InsightsModule |
| `frontend/app/components/NotificationDropdown.tsx` | Add insight rendering + action buttons |
| `frontend/app/settings/notifications/page.tsx` | Add smartInsights toggle |
