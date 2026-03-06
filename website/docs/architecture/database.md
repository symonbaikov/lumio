---
title: Database Architecture
description: Entities, migrations, and data safety
---

Lumio uses TypeORM with migration-driven schema changes and explicit entity definitions.

## Entity model

The backend defines 50+ entities under `backend/src/entities`. Highlights:

- `statement`, `transaction`, `import_session` for ingestion
- `workspace`, `workspace_member`, `user` for tenancy
- `audit_event`, `notification`, `report_history` for governance
- `integration_token`, `gmail_settings`, `dropbox_settings`, `google_sheet` for integrations

## Migrations

- Stored under `backend/src/migrations`
- Schema changes are always migration-based (`synchronize: false`)
- Idempotency checks are run in CI by applying migrations twice

## Data safety patterns

- Soft deletes for recoverable data removal
- SHA-256 hashes to prevent duplicate statement imports
- Idempotency keys for integration and webhook calls

## Indexing and performance

Transaction-heavy tables include indices for workspace, date, and hash fields. Deduplication uses both hash
comparisons and similarity thresholds (date, amount, text).

Next: [Parsing Pipeline](parsing-pipeline)
