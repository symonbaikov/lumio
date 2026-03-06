---
title: Workspaces and RBAC
description: Multi-tenant setup and permissions
---

Lumio is multi-tenant by design. Every statement, transaction, and report belongs to a workspace.

## Core concepts

- **Workspace**: Isolated data domain for a company or business unit
- **Workspace members**: Users with assigned roles
- **Permissions**: Enforced at the controller level via `@RequirePermission()`

## Typical roles

- Admin: Full access to settings, imports, and members
- Manager: Can import and review statements
- Analyst: Read-only access to reports and dashboard

## Workspace setup

1. Create a workspace during onboarding.
2. Invite members from Settings -> Workspace.
3. Assign roles and permissions.

## Audit log

The audit log tracks key mutations, including imports, deletions, and permission changes. Use it to trace or
rollback changes.

![Audit log](/img/screenshots/audit-log.png)

Next: [Integrations](integrations)
