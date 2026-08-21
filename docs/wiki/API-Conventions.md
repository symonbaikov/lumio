# API Conventions

Base URL: `/api/v1`. Interactive reference: `http://localhost:3001/api/docs` (Swagger, generated from decorators — if a route is undocumented there, it is missing its decorators).

## Auth

| Route | Purpose |
|---|---|
| `POST /auth/register` | Create an account |
| `POST /auth/login` | Access + refresh token pair |
| `POST /auth/refresh` | Rotate — send the **refresh** token as the bearer |
| `POST /auth/logout` | Revoke the current session |
| `POST /auth/logout-all` | Revoke every session |
| `GET /auth/sessions` | List active per-device sessions |
| `POST /auth/sessions/:sessionId/logout` | Revoke one device |
| `GET /auth/me` | Current user |
| `GET /auth/google/callback` | Google OAuth callback |

Access tokens are short-lived, refresh tokens long-lived, one `AuthSession` row per device, and refresh **rotates** on every use — a replayed old refresh token is a theft signal, not a retry.

Send on every authenticated call:

```
Authorization: Bearer <access_token>
x-workspace-id: <workspace uuid>
```

## Guards, in order

Global `JwtAuthGuard` → global `ThrottlerGuard` → `WorkspaceContextGuard` → `PermissionsGuard`.

```ts
@Public()                                   // opt out of JWT
@RequirePermission(Permission.REPORT_EXPORT) // fine-grained RBAC
@Audit({ … })                                // record the mutation in the audit log
@CurrentUser() user: User
@WorkspaceId() workspaceId: string
```

Rate limits: **500 req/min** for the authenticated tier, **100 req/hour** on the default tier.

## Request rules

- REST nouns, not verbs: `/transactions`, never `/getTransactions`. `GET` read, `POST` create/trigger, `PATCH` partial, `PUT` replace, `DELETE` remove.
- Every input is a DTO with `class-validator` decorators. The global pipe runs `whitelist` + `forbidNonWhitelisted` + `transform` — an unknown field is a **400**, so a typo'd property fails loudly instead of being ignored.
- Never accept a `workspaceId` from the body. It comes from the guard.
- Never return a TypeORM entity — map to a DTO so the API contract does not shift when the schema does.

## Responses

Success responses are the resource DTO. Lists carry their pagination meta.

Errors are uniform, emitted by `HttpExceptionFilter`:

```json
{
  "error": { "code": "FORBIDDEN", "message": "…", "details": { … } },
  "requestId": "…",
  "traceId": "…",
  "timestamp": "2026-08-21T10:00:00.000Z",
  "path": "/api/v1/transactions"
}
```

Messages are localized from the request locale. `requestId` / `traceId` are also returned as the `x-request-id` / `x-trace-id` headers (CORS-exposed) — quote them in bug reports, they tie a user's failure to the exact server log line.

> `.claude/rules/api-standards.md` describes a `{ success, data, meta }` envelope. There is **no global transform interceptor** — success responses are currently bare DTOs. Treat the envelope as the target state for a future `/api/v2`, not as today's contract.

## Idempotency

Mandatory for financial writes (`.claude/rules/idempotency.md`):

- Upload endpoints accept an `Idempotency-Key` header, persisted in the `IdempotencyKey` entity; a repeated key returns the first result rather than creating a duplicate.
- Statements deduplicate on the SHA-256 `fileHash`.
- Transactions deduplicate on a fingerprint across statements.
- Multi-table writes run inside a DB transaction; "check-then-act" must be atomic or it races.
- `DELETE` is naturally idempotent — deleting a missing row is a no-op, not a 404 storm.

## Versioning

URI versioned. No breaking changes inside `v1` — new optional fields are fine, changed semantics are not. A breaking change means `v2`.

## Programmatic access

API keys are `lum_`-prefixed and stored SHA-256 hashed; the plaintext is shown once at creation. Managing them requires `api_key.manage`, which platform `user` and `viewer` roles intentionally lack.

## Real-time

Socket.IO alongside REST for notifications and import progress. Same auth; treat socket payloads as notifications to refetch, not as an authorization source.
