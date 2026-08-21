# Architecture

## Shape

```
Browser ──REST /api/v1 + Socket.IO──▶ NestJS backend (3001) ──▶ PostgreSQL 14
   │                                        │                └─▶ Redis 7 (cache, throttle, queues)
   └── Next.js frontend (3000)              └──▶ External: SMTP/IMAP, S3, WebDAV,
                                                  Telegram, OpenAI-compatible endpoint
```

Two deployables (`backend/`, `frontend/`) plus optional wrappers: `electron/` (desktop shell), `mcp-server/` (Claude MCP integration), `website/` (marketing), `observability/` (Prometheus + Grafana config).

## Request lifecycle

Every authenticated request passes the same chain, wired in `backend/src/app.module.ts` and `backend/src/main.ts`:

1. **`requestContextMiddleware`** — assigns a request id / trace id, stored in an AsyncLocalStorage `RequestContext`. Exposed to the browser via the `x-request-id` and `x-trace-id` response headers.
2. **Global prefix** `api/v1`.
3. **`ValidationPipe`** — `whitelist`, `forbidNonWhitelisted`, `transform`. Unknown body fields are a 400, not silently dropped.
4. **`JwtAuthGuard`** (global) — opt out per route with `@Public()`.
5. **`ThrottlerGuard`** (global) — 500 req/min authenticated, 100 req/hour default tier.
6. **`WorkspaceContextGuard`** (per controller) — resolves the `x-workspace-id` header into a verified membership. See [Multi-Tenancy & RBAC](Multi-Tenancy-and-RBAC).
7. **`PermissionsGuard`** — enforces `@RequirePermission(...)`.
8. **Controller** → **Service** → **TypeORM repository**.
9. **Interceptors** on the way out: `LoggingInterceptor` (structured JSON), `HttpMetricsInterceptor` (Prometheus), `AuditInterceptor` (writes audit events for decorated mutations).
10. **`HttpExceptionFilter`** catches everything and returns a uniform error envelope.

## Layer rules

`.claude/rules/clean-architecture.md` is the binding version; the practical summary:

- **Controllers are thin.** Route, validate, delegate. No business logic, no repository calls.
- **Services own the use case.** Cross-table writes go in a DB transaction.
- **Entities are persistence**, not API contracts — never return a TypeORM entity straight to the client, map to a DTO.
- **Cross-module talk** goes through exported services or the `EventEmitter`, not by importing another module's repositories.

Shared machinery lives in `backend/src/common/`:

| Path | Contents |
|---|---|
| `common/guards/` | `jwt-auth`, `permissions`, `workspace-context` |
| `common/decorators/` | `@RequirePermission`, `@WorkspaceId`, `@CurrentWorkspace`, workspace auth composite |
| `common/interceptors/` | request logging |
| `common/filters/` | `HttpExceptionFilter` (localized messages, request id, trace id) |
| `common/observability/` | `AppLogger`, request context, metrics |
| `common/services/` | `WorkspaceCrudBaseService` — the tenant-safe CRUD base |
| `common/enums/permissions.enum.ts` | the permission vocabulary |

## Async work

- **Scheduling** — `@nestjs/schedule` cron jobs (Telegram reports, mailbox polling, cleanup).
- **Events** — `@nestjs/event-emitter` for in-process fan-out (audit, notifications, webhooks).
- **Real-time** — Socket.IO for notification pushes and import progress.
- **Cache / throttle store** — Redis via `cache-manager`.

## Where things live

```
backend/src/
  modules/      one folder per feature — see Backend Modules
  entities/     TypeORM entities (schema of record)
  migrations/   numbered, append-only
  common/       guards, decorators, interceptors, filters, observability
  config/       typed config factories
backend/@tests/ unit + e2e specs (*.spec.ts)
frontend/app/   App Router routes, components, hooks, contexts, stories
docs/plans/     per-feature design docs written before implementation
```
