# Admin Audit Tab Parity + Drill-Down Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the admin audit tab to match the /audit table, filters, and drill-down drawer behavior.

**Architecture:** Reuse the existing audit table and filter patterns from `frontend/app/audit` by aligning columns, filters, and formatter usage in the admin page. Wire row click to `AuditEventDrawer` and ensure query params are sent for filters.

**Tech Stack:** Next.js 14, React, TypeScript, MUI (admin page), existing audit utilities/components.

---

### Task 1: Inspect current admin audit tab and audit page parity

**Files:**
- Read: `frontend/app/admin/page.tsx`
- Read: `frontend/app/admin/page.content.ts`
- Read: `frontend/app/audit/page.tsx`
- Read: `frontend/app/audit/components/AuditEventDrawer.tsx`
- Read: `frontend/app/audit/utils/formatAuditEvent.ts`

**Step 1: Review current admin audit table and filters**

Locate the current admin audit tab table, filters, and row interaction behavior in `frontend/app/admin/page.tsx`.

**Step 2: Review /audit table structure and filter controls**

Identify the columns, filter inputs, query param wiring, and row click behavior in `frontend/app/audit/page.tsx`.

**Step 3: Note copy/label differences**

Identify the user-facing labels and copy in `frontend/app/admin/page.content.ts` that need alignment with /audit.

### Task 2: Align admin audit table columns and formatter usage

**Files:**
- Modify: `frontend/app/admin/page.tsx`
- Read: `frontend/app/audit/utils/formatAuditEvent.ts`

**Step 1: Replace admin audit columns to match /audit**

Copy the same column structure used in `/audit` (including formatter usage for human-readable descriptions).

**Step 2: Ensure human-readable formatting**

Use `formatAuditEvent` (or the same formatting helpers) so the admin audit tab displays the same labels as /audit.

### Task 3: Add parity filters on admin audit tab

**Files:**
- Modify: `frontend/app/admin/page.tsx`

**Step 1: Add filter controls**

Add user, action, entity, date range, and severity filters matching /audit behavior.

**Step 2: Wire filters to query params**

Ensure filter selections update the admin audit query params in the same way as `/audit` so requests include those filters.

### Task 4: Add drill-down with AuditEventDrawer

**Files:**
- Modify: `frontend/app/admin/page.tsx`
- Modify (if needed): `frontend/app/audit/components/AuditEventDrawer.tsx`

**Step 1: Wire row click to open drawer**

On audit row click, open `AuditEventDrawer` with the selected event and ensure diff/metadata render.

**Step 2: Update labels if needed**

If labels are missing or unclear for the admin view, adjust `AuditEventDrawer` to provide richer labels.

### Task 5: Update admin page copy/labels

**Files:**
- Modify: `frontend/app/admin/page.content.ts`

**Step 1: Align labels with /audit**

Update copy so the admin audit tab uses human-readable labels consistent with /audit.

### Task 6: Manual verification

**Step 1: Check human-readable descriptions**

Confirm the admin audit tab shows the same human-readable descriptions as /audit.

**Step 2: Check drawer drill-down**

Click a row and verify the `AuditEventDrawer` opens with diff/metadata.

**Step 3: Check filter query params**

Adjust filters and confirm the query params are sent as expected.

### Task 7: Commit

**Step 1: Stage changes**

```bash
git add frontend/app/admin/page.tsx \
  frontend/app/admin/page.content.ts \
  frontend/app/audit/components/AuditEventDrawer.tsx
```

**Step 2: Commit**

```bash
git commit -m "feat(admin): human-readable audit log"
```
