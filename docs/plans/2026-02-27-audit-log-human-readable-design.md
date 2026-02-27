# Human-Readable Audit Log Design

**Goal**
Turn the audit log into an admin-facing control tool by adding human-readable descriptions, structured columns, filtering, and drill-down details without a radical UI redesign.

## Scope
- Surfaces: `/admin` audit tab and `/audit` page.
- Backend: add list filters for action and actor label search.
- Frontend: human-readable descriptions, structured columns, severity/action hierarchy, drill-down drawer.

## Approach Overview
1. **Backend filters**
   - Extend the audit list API to filter by `action` and `actorLabel`.
   - Keep existing data model; no migrations required.

2. **Frontend formatting**
   - Build human-readable descriptions from `diff` and `meta` fields with safe fallbacks.
   - Map action + entity types to friendly labels.

3. **UI structure**
   - Columns: Action, Object, Description, User, Date, Severity.
   - Add filters for user, action, entity, date range, severity, and keep batch ID on `/audit`.
   - Use action/severity color cues (delete/red, submit/blue, approve/green, warn/orange, critical/red).

4. **Drill-down**
   - Row click opens side drawer showing JSON diff, before/after, entity ID, and related actions.

## Backend Changes
### API Filters
- Add query params: `action`, `actorLabel`.
- Backend `AuditEventFilter` supports both fields.
- Query builder filters:
  - `action` → `event.action = :action`
  - `actorLabel` → `event.actorLabel ILIKE :actorLabel` (case-insensitive search).

## Frontend Changes
### Human-Readable Description
The description formatter will:
1. Prefer `diff.before/after` keys to generate field-level changes.
2. Use `meta` hints (e.g., `fileName`, `statementId`, `cell.a1`) to provide context.
3. Fall back to `{entityType} • {entityId}` if no usable diff/meta is present.

Example output:
- User admin@example.com changed category
- Document: Kaspi statement Feb 2026
- Transaction: 11/25/2025 — 6,189.00
- Field: category
- From: Marketing
- To: Office expenses

### Action Labels
Friendly labels per action (UI only):
- create → Create
- update → Change
- delete → Delete
- import → Submit
- export → Export
- apply_rule → Approve
- rollback → Rollback
- link/unlink → Link/Unlink
- match/unmatch → Match/Unmatch

### Column Structure
- Action
- Object
- Description
- User
- Date
- Severity

### Filters
- User (actorLabel text search)
- Action (select)
- Entity (select)
- Date range (from/to)
- Severity (select)
- Batch ID (keep for `/audit` power users)

### Drill-Down Drawer
Use existing drawer to show:
- JSON diff
- Before/After
- Entity ID
- Related action (`meta.rollbackOf`)

## Non-Goals
- No new entity name lookups from other APIs.
- No large UI redesign or layout overhaul.
- No changes to audit event persistence or schema.

## Risks & Mitigations
- **Sparse diff/meta** → provide graceful fallback text.
- **Large diff payloads** → render only summary by default, keep JSON available in drawer.

## Validation
- Verify filters return expected events from API.
- Confirm human-readable descriptions for common event types.
- Ensure row click opens drawer with diff/metadata.
