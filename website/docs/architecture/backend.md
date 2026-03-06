---
title: Backend Architecture
description: NestJS modules, guards, and decorators
---

The backend is a NestJS 11 application organized into feature modules under `backend/src/modules`.

## Module layout

Core modules include:

- `auth`, `users`, `workspaces` for identity and tenancy
- `import`, `parsing`, `statements`, `transactions` for ingestion pipeline
- `classification` for AI categorization
- `audit`, `notifications`, `reports`, `dashboard` for product workflows
- `gmail`, `google-drive`, `dropbox`, `google-sheets`, `telegram` for integrations

## Security and access control

- **JWT auth guard** applies globally with access + refresh tokens.
- **Workspace context guard** scopes every request to the active workspace.
- **Permissions guard** enforces RBAC via `@RequirePermission()`.

## Audit logging

Most mutation endpoints are decorated with `@Audit()` which records old/new values and can generate rollback
instructions. Audit entries are stored in `audit_event` and surfaced in the UI.

## API documentation

Swagger (OpenAPI) is served at:

```
http://localhost:3001/api/docs
```

## Real-time updates

Socket.IO is used for background imports, notifications, and progress events. These are emitted from the
`notifications` and `import` modules.

Next: [Frontend Architecture](frontend)
