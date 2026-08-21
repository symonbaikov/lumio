# Data Model & Migrations

PostgreSQL 14 via TypeORM 0.3. Entities in `backend/src/entities/`, migrations in `backend/src/migrations/`.

## The hard rule

`synchronize` is **`false`** and stays false. Schema changes happen only through numbered migration files. Migrations run automatically on startup unless `RUN_MIGRATIONS=false`.

Always use the npm scripts, never raw `typeorm`: `migration:run` acquires a lock so concurrent deploy replicas cannot run migrations at once.

```bash
# apply
make migrate                                   # Docker
npm --prefix backend run migration:run:dev     # dev, ts-node, no lock
npm run migration:run                          # prod path, builds + locks

# generate after editing an entity
make migrate-generate name=AddTransactionMerchantColumn
npm run migration:generate -- src/migrations/AddTransactionMerchantColumn

# revert the last one
make migrate-revert
```

## Changing an entity

1. Edit the entity in `backend/src/entities/`.
2. Generate the migration — do not hand-write it unless the generator gets it wrong.
3. **Read the generated SQL.** The generator happily emits destructive DDL from a rename.
4. Run it locally, then run it again on a fresh database (`make clean` + startup) to prove it applies from zero.
5. Migrations that drop columns or rewrite data need peer review and a backup plan.
6. Commit entity + migration together. An entity change without its migration breaks everyone's next startup.

## Integrity conventions

- **Foreign keys** are declared on the entity, not enforced in application code only.
- **Soft delete** for business data: a `deletedAt` timestamp (statements, among others). Physical deletion is reserved for temporary data and explicit GDPR erasure.
- **Multi-table writes** run in a DB transaction.
- **Audit**: changes to balances and critical settings land in the audit log. The audit trail is append-only; corrections are new events, not edits.
- **Corrections over edits** for confirmed financial records — reversal/adjustment entries, so history stays reconstructible.
- **Concurrency** on balance updates: optimistic locking (version column) or `SELECT FOR UPDATE`. Read-modify-write without one of those loses updates under load.
- **Indexes** cover every query on a high-traffic endpoint. Tenant-scoped tables index `workspaceId` because every query filters on it.

## Tenancy in the schema

Tenant-scoped tables carry `workspace_id` with `ON DELETE CASCADE` to `workspaces`. New tenant tables follow the same shape — that plus the query filter from [Multi-Tenancy & RBAC](Multi-Tenancy-and-RBAC) is what keeps tenants apart.

## Naming

Entity properties are `camelCase`, columns are `snake_case` via explicit `name:` — TypeORM's implicit naming is not relied on. Index names are explicit (`IDX_<table>_<columns>`) so migrations stay diffable.

## Operational

```bash
make db-shell                    # psql
make db-backup                   # dump to .sql
make db-restore file=backup.sql  # restore
```

Take a backup before running a data-modifying migration in production. `make clean` destroys the Docker volumes — dev only.
