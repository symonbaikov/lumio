# Dashboard Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework the dashboard into a business-owner-friendly layout with prioritized actions, clear financial snapshot, compact cash flow, and human-readable activity feed.

**Architecture:** Use existing dashboard hooks (`useDashboard`) and components, refactor UI composition in `frontend/app/page.tsx`, and update dashboard components to present tasks with priorities/CTAs, KPI snapshot, mini cash flow chart, and grouped readable activity events. Keep data flow unchanged where possible; map raw events to human-friendly labels on render.

**Tech Stack:** Next.js 14 (app router), React, TypeScript, Tailwind, Lucide icons, existing dashboard hooks.

---

### Task 1: Add design tokens (palette/typography) and shared styles for dashboard cards

**Files:**
- Modify: `frontend/app/globals.css` (or shared CSS token file) to add CSS variables for new palette (gold/purple/neutral) and apply font stack if not present.
- Modify: `frontend/app/components/dashboard/common.ts` (create if missing) for reusable classNames (card shells, badges, priority colors).

**Step 1: Add CSS variables for primary/secondary/cta/background/text per design system.**

**Step 2: Ensure typography imports (Fira Sans primary, optional Fira Code for numerics) are available globally.**

**Step 3: Export utility class maps for priorities (critical/warning/info/success) and card chrome.**

**Step 4: No tests (styling).**

### Task 2: Refactor ActionRequired to show tasks with priorities + CTA

**Files:**
- Modify: `frontend/app/components/dashboard/ActionRequired.tsx`
- Modify: `frontend/app/components/dashboard/ActionRequired.test.tsx` (if exists; otherwise add a basic render test)

**Step 1: Change props to accept priority level, label, count, cta label/link, period/context label.**

**Step 2: Render cards with icon, priority badge color, CTA button (`Review now`/custom), and optional “age/period” pill.**

**Step 3: Add empty state inline message.**

**Step 4: Update tests (or add) to assert rendering of priority styling and CTA presence.**

### Task 3: Add Financial Overview KPI row with deltas

**Files:**
- Add: `frontend/app/components/dashboard/FinancialOverview.tsx`
- Add: `frontend/app/components/dashboard/FinancialOverview.test.tsx`

**Step 1: Component takes KPIs (income30d, expense30d, netFlow, unapprovedCash, totalBalance) and period label/deltas.**

**Step 2: Render compact cards with value, delta chip (green/red), and sublabel for period.**

**Step 3: Tests: render all KPIs, delta color logic, empty handling.**

### Task 4: Add compact Cash Flow mini-chart block

**Files:**
- Modify: `frontend/app/components/dashboard/CashFlowChart.tsx` (or wrap) for mini variant
- Add: `frontend/app/components/dashboard/CashFlowMini.tsx` if cleaner
- Add/Update tests accordingly

**Step 1: Provide 30d line/area chart variant with tooltip; respect existing data shape.**

**Step 2: Add empty state CTA to upload statements.**

**Step 3: Tests for rendering data vs empty.**

### Task 5: Refactor RecentActivity to human-readable, grouped by date

**Files:**
- Modify: `frontend/app/components/dashboard/RecentActivity.tsx`
- Modify/Add: `frontend/app/components/dashboard/RecentActivity.test.tsx`

**Step 1: Add helper to map raw activity types (statement/transaction/receipt/import/delete/update) to icon + readable title. Strip UUIDs.**

**Step 2: Group by date buckets (“Today”, “Yesterday”, “This week”, “Earlier”).**

**Step 3: Render event rows with icon, title, context (amount/file/statement name), actor, date.**

**Step 4: Tests: grouping labels, mapping correctness, hides raw UUID, shows readable text.**

### Task 6: Recompose dashboard page layout

**Files:**
- Modify: `frontend/app/page.tsx`

**Step 1: Replace old summary row usage with new `FinancialOverview` and mini cash flow block.**

**Step 2: Place `ActionRequired` above overview; limit to top 3–4 actions, ordered by priority.**

**Step 3: Place `RecentActivity` below graphs; pass mapped data.**

**Step 4: Ensure responsive grid and spacing align with design system.**

**Step 5: No new tests here; covered by component tests.**

### Task 7: Wire data mapping for priorities and readable events

**Files:**
- Modify: `frontend/app/hooks/useDashboard.ts` (if needed) or map in `page.tsx`

**Step 1: Map actions to include priority (critical/warning/info/success) and CTA route labels.**

**Step 2: Map recentActivity items to readable event shape (type, title, context, actor, date, amount/file).**

**Step 3: Keep API untouched; transformations happen client-side.**

**Step 4: Add minimal unit test for mapper if placed in a helper file.**

### Task 8: Verification

**Files:**
- N/A (commands)

**Step 1: Run frontend tests: `cd frontend && npm test -- --runInBand` (or `make test-frontend`).**

**Step 2: Run lint if quick: `cd frontend && npm run lint` (or `make lint`).**

**Step 3: Visual spot-check locally if possible (manual).**
