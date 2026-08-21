# Multi-Tenancy & RBAC

The single most dangerous area of the codebase. A missing `workspaceId` filter is a cross-tenant data leak, not a bug report.

## Workspace context

Clients send the active workspace in a header:

```
x-workspace-id: <uuid>
```

`WorkspaceContextGuard` (`common/guards/workspace-context.guard.ts`) resolves it:

1. Header missing → `403 Workspace context is required`
2. No `WorkspaceMember` row for `(workspaceId, userId)` → `403 You are not a member of this workspace`
3. Otherwise it attaches `request.workspace`, `request.workspaceRole`, `request.workspaceMemberPermissions`

Controllers read it through parameter decorators — never off the raw request:

```ts
@Get()
findAll(@WorkspaceId() workspaceId: string) { … }
```

`@CurrentWorkspace()` gives the full entity when you need more than the id.

## The isolation rule

> Every query touching tenant data filters by `workspaceId`.

Guard membership at the edge **and** filter in the query. The guard proves *you belong to workspace X*; it does not prove *this row belongs to workspace X*. Both checks are required — otherwise passing another tenant's row id through a valid workspace header reads their data.

```ts
// wrong — trusts the id
this.repo.findOne({ where: { id } });

// right
this.repo.findOne({ where: { id, workspaceId } });
```

`WorkspaceCrudBaseService` (`common/services/`) already does this — prefer extending it over hand-rolling CRUD.

## Two role systems

They are different and both apply.

**Platform role** — `UserRole` on the user: `admin`, `user`, `viewer`. `admin` bypasses `PermissionsGuard` entirely.

**Workspace role** — `WorkspaceRole` on the membership: `owner`, `admin`, `member`, `viewer`. Scoped to one workspace; a user can be owner in one and viewer in another.

`WorkspaceMember.permissions` additionally carries per-member override flags (`canEditStatements`, `canEditCustomTables`, `canEditCategories`, …).

## Permissions

The vocabulary is `common/enums/permissions.enum.ts` — dotted strings grouped by domain:

`statement.view|upload|edit|delete` · `transaction.view|edit|delete|bulk_update` · `category.*` · `branch.*` · `wallet.*` · `payable.*` · `budget.*` · `goal.*` · `subscription.*` · `report.view|export` · `telegram.view|connect|send` · `user.manage`, `user.view_all`, `audit_log.view` · `api_key.manage` · `workspace_settings.manage`, `integration.manage`

`ROLE_PERMISSIONS` maps platform roles to defaults: `admin` gets everything; `user` and `viewer` get view-only sets. **`api_key.manage` is deliberately excluded from `user` and `viewer`** — do not "fix" that.

## How a check resolves

`PermissionsGuard` (`common/guards/permissions.guard.ts`), in order:

1. No `@RequirePermission()` on the route → allow.
2. Platform `admin` → allow.
3. User's explicit `user.permissions` array if set, otherwise `ROLE_PERMISSIONS[user.role]` → allow if it covers **all** required permissions.
4. Fall back to workspace role: audit permissions and workspace-config permissions (`workspace_settings.manage`, `integration.manage`) are granted to workspace `admin` / `owner`.
5. Otherwise `403` naming the missing permissions.

`audit_view` and `audit_log.view` are aliases and are normalized to each other — check either, they behave the same.

## Adding a permission

1. Add the constant to `Permission`.
2. Add it to the right `ROLE_PERMISSIONS` entries — omission means deny, which is the correct default.
3. Decorate the route: `@RequirePermission(Permission.THING_EDIT)`.
4. Mirror it in the frontend `usePermissions()` hook so the UI hides what the API would reject.
5. Write a spec that asserts a `viewer` gets a 403.

## Invitations

Workspace invitations are token-based with email delivery. If neither UI SMTP settings nor the env fallback are configured, the API returns the invite link in the response and sends nothing — that is intended behavior for self-hosted setups without mail.
