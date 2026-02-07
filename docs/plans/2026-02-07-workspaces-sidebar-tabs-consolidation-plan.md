# Workspace Sidebar Tabs Consolidation Plan

## Goal

Restructure workspace management into a single tabbed experience in `/workspaces`, following the same routing/navigation approach as the statements page.

Tabs:

1. `Overview`
2. `Members`
3. `Categories`

## Agreed Decisions

- Routing pattern: same as statements (separate sub-routes per tab).
- Workspace page scope: replace current `/workspaces` behavior with tabbed workspace area when a workspace is active.
- Categories: embedded in workspace tabs.
- Settings consolidation: remove standalone `/settings/workspace` functionality and point it to workspace tabs.
- Categories standalone page: remove separate `/categories` route.
- Workspace list access: keep both existing nav workspace switcher and add list access from workspace sidebar.
- If no active workspace for tab routes: redirect to workspace list.

## Target Route Structure

- `/workspaces`
  - router entrypoint:
    - if active workspace exists -> redirect to `/workspaces/overview`
    - else -> redirect to `/workspaces/list`
- `/workspaces/list` (all workspaces selector/list)
- `/workspaces/overview` (workspace info/settings)
- `/workspaces/members` (members and invitations)
- `/workspaces/categories` (embedded categories management)

Deprecated/removed behavior:

- `/categories` (removed)
- `/settings/workspace` full page (replaced by redirect to `/workspaces/overview`)
- Categories item in profile menu (removed)

## Implementation Scope

### 1) Sidebar Tabs (statements-style)

Create `WorkspaceSidePanel` using the side panel system (`useSidePanelConfig`, `autoRegister: true`), with:

- Header:
  - title: `Workspace`
  - subtitle: current workspace name
- Navigation section:
  - `Overview` -> `/workspaces/overview`
  - `Members` -> `/workspaces/members` (badge with member count)
  - `Categories` -> `/workspaces/categories`
- Quick action/link:
  - `All Workspaces` -> `/workspaces/list`

### 2) Workspace Router Entrypoint

Update `/workspaces/page.tsx` to act as a redirect router:

- wait for workspace context loading
- redirect to `/workspaces/overview` when workspace exists
- redirect to `/workspaces/list` when none exists

### 3) Workspace List Page

Move current workspace list UI from `/workspaces/page.tsx` into `/workspaces/list/page.tsx`:

- search
- sort (favorites/alphabetical/recent)
- grid/list view
- workspace cards
- create workspace modal

### 4) Overview Tab

Create `/workspaces/overview/page.tsx`:

- render `<WorkspaceSidePanel activeItem="overview" />`
- render `WorkspaceOverviewView`

`WorkspaceOverviewView` contains workspace settings from the old settings page:

- editable workspace name
- editable description
- background selector
- currency display
- plan display
- owner-only delete action

### 5) Members Tab

Create `/workspaces/members/page.tsx`:

- render `<WorkspaceSidePanel activeItem="members" />`
- render `WorkspaceMembersView`

`WorkspaceMembersView` includes:

- members header with total count
- members list (avatar/name/email/role badge)
- remove member action (permission guarded)
- invite member form (role + permissions)
- pending invitations list with copy-link

### 6) Categories Tab (Embedded)

Create `/workspaces/categories/page.tsx`:

- render `<WorkspaceSidePanel activeItem="categories" />`
- render workspace-embedded categories UI (from old `/categories`)

Migration expectation:

- move/reuse existing categories page logic into workspace tab component
- keep create/edit/toggle flows unchanged

### 7) Navigation Cleanup

Update profile menu navigation:

- remove `Categories` link from desktop dropdown
- remove `Categories` link from mobile menu

### 8) Settings Route Consolidation

Replace `/settings/workspace/page.tsx` with redirect-only page:

- redirect to `/workspaces/overview`

### 9) Remove Standalone Categories Route

Delete old categories route files after embedding is complete:

- `frontend/app/categories/page.tsx`
- `frontend/app/categories/page.content.ts`

## Proposed File Changes

### New

- `frontend/app/(main)/workspaces/list/page.tsx`
- `frontend/app/(main)/workspaces/overview/page.tsx`
- `frontend/app/(main)/workspaces/members/page.tsx`
- `frontend/app/(main)/workspaces/categories/page.tsx`
- `frontend/app/(main)/workspaces/components/WorkspaceSidePanel.tsx`
- `frontend/app/(main)/workspaces/components/WorkspaceOverviewView.tsx`
- `frontend/app/(main)/workspaces/components/WorkspaceMembersView.tsx`

### Modified

- `frontend/app/(main)/workspaces/page.tsx`
- `frontend/app/components/Navigation.tsx`
- `frontend/app/settings/workspace/page.tsx`

### Removed

- `frontend/app/categories/page.tsx`
- `frontend/app/categories/page.content.ts`

## Data and API Usage

- Workspace context:
  - `currentWorkspace`
  - `workspaces`
  - `switchWorkspace`
- API endpoints used by tab content:
  - `GET /workspaces/me`
  - `GET /workspaces/:id`
  - `PATCH /workspaces/:id`
  - `DELETE /workspaces/:id`
  - `POST /workspaces/invitations`
  - `DELETE /workspaces/members/:userId`
  - categories endpoints already used in current categories implementation

## UX/Behavior Requirements

- Tabs are route-driven (deep-linkable, refresh-safe).
- Active tab highlighting in sidebar.
- Sidebar includes direct access to workspace list.
- If workspace becomes unavailable (removed access/deleted), fallback to `/workspaces/list`.
- Keep existing workspace switcher in top navigation.

## Delivery Sequence

1. Build `WorkspaceSidePanel`.
2. Create `/workspaces/list` and move current list UI.
3. Implement `/workspaces` redirect router logic.
4. Implement overview tab.
5. Implement members tab.
6. Embed categories into `/workspaces/categories`.
7. Remove categories from profile menu.
8. Redirect `/settings/workspace` to `/workspaces/overview`.
9. Remove standalone `/categories` route.
10. Verify navigation and core CRUD flows.

## Verification Checklist

- `/workspaces` redirects correctly by active workspace state.
- `/workspaces/list` opens and switching workspace works.
- `/workspaces/overview` loads and saves workspace metadata.
- `/workspaces/members` shows members/invitations and invite flow works.
- `/workspaces/categories` supports create/edit/enable-disable.
- Profile dropdown no longer shows Categories.
- `/settings/workspace` redirects to `/workspaces/overview`.
- Legacy `/categories` route is removed.
