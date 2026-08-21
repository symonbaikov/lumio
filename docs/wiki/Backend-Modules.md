# Backend Modules

One folder per feature under `backend/src/modules/`. Use this as a "which module owns this?" index — run `ls backend/src/modules` for the live list.

## Ingestion

| Module | Owns |
|---|---|
| `statements` | Statement upload, lifecycle, soft delete, file hash idempotency |
| `parsing` | Parser factory, bank parsers, OCR, normalization, quality gates — see [Statement Parsing](Statement-Parsing) |
| `import` | Import session tracking and progress |
| `transactions` | Transaction CRUD, search, fingerprint deduplication |
| `receipts` | Receipt records and the receipt browser |
| `data-entry` | Manual cash/income entry with custom fields and attachments |

## Intelligence

| Module | Owns |
|---|---|
| `classification` | AI auto-categorization + per-workspace learned rules |
| `ai-analysis` | Chats, completions, model listing, semantic search over an OpenAI-compatible endpoint |
| `insights` | Generated financial insights surfaced on the dashboard |

## Money & reporting

| Module | Owns |
|---|---|
| `dashboard` | Aggregates: cash flow, trends, top categories |
| `reports` | Report builder, CSV/XLSX export |
| `balance` | Balance-sheet accounts and historical snapshots |
| `net-worth` | Net-worth rollup |
| `budgets`, `goals` | Budget/goal tracking and alerts |
| `subscriptions` | Recurring-billing detection |
| `payables` | Accounts-payable workflow |
| `crypto` | Read-only crypto wallet connections folded into stats |
| `exchange-rates` | FX rates |

## Reference data

`categories` (hierarchical), `branches`, `wallets`, `tax-rates`, `custom-tables` (user-defined typed tables with formulas and Sheets import).

## Access & tenancy

| Module | Owns |
|---|---|
| `auth` | Register, login, Google callback, refresh rotation, per-device sessions |
| `users` | Profile, avatars, per-user permission overrides |
| `workspaces` | Workspaces, membership, roles, invitations |
| `api-keys` | `lum_`-prefixed, SHA-256 hashed programmatic keys |
| `audit` | Event log, description rendering, rollback service |

## Platform

| Module | Owns |
|---|---|
| `storage` | Document store: folders, tags, versions, per-file permissions, expiring share links |
| `notifications` | In-app feed, per-category preferences, unread counts |
| `webhooks` | Outbound subscriptions, deliveries, inbound provider webhooks |
| `open-protocol-integrations` | S3, WebDAV, IMAP handlers |
| `telegram` | Bot, scheduled reports |
| `application-settings` | Runtime system configuration |
| `backups` | Backup jobs |
| `observability` | `/api/v1/metrics` Prometheus endpoint |

## Legacy / migration compatibility

`gmail`, `google-drive`, `google-sheets`, `dropbox`. Kept for users migrating off closed SaaS. **Do not add new closed-SaaS SDKs** — new integration work goes through open protocols (SMTP, IMAP, WebDAV, S3-compatible, OpenAI-compatible), see [Integrations & Webhooks](Integrations-and-Webhooks).

## Adding a module

1. `backend/src/modules/<name>/` with `<name>.module.ts`, `controllers/`, `services/`, `dto/`.
2. Entities go in `backend/src/entities/`, plus a migration — see [Data Model & Migrations](Data-Model-and-Migrations).
3. Tenant-scoped data: extend `WorkspaceCrudBaseService` or filter by `workspaceId` in every query.
4. Register in `app.module.ts`.
5. Guard the controller: `@RequirePermission(...)` plus a permission in `common/enums/permissions.enum.ts` if the vocabulary needs a new verb.
6. Swagger decorators on every route, `class-validator` DTOs on every input.
7. Specs in `backend/@tests/`.
