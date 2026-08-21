# Lumio Wiki

Lumio turns unstructured financial documents (bank statement PDFs, CSV/XLSX exports, scanned images, email receipts) into clean, queryable, multi-tenant data.

The [README](https://github.com/symonbaikov/lumio/blob/main/README.md) answers *what Lumio does* and *how to run it*.
This wiki answers *how it works inside* and *how to extend it*.

## Start here

| Page | Read it when |
|---|---|
| [Getting Started](Getting-Started) | You just cloned the repo and want it running |
| [Architecture](Architecture) | You want the request lifecycle and layer boundaries |
| [Backend Modules](Backend-Modules) | You need to find which module owns a feature |
| [Statement Parsing](Statement-Parsing) | You are adding a bank parser or debugging a bad import |
| [Multi-Tenancy & RBAC](Multi-Tenancy-and-RBAC) | You touch any query, guard, or permission |
| [API Conventions](API-Conventions) | You are adding or changing an endpoint |
| [Data Model & Migrations](Data-Model-and-Migrations) | You are changing an entity |
| [Integrations & Webhooks](Integrations-and-Webhooks) | You are wiring an external system |
| [Frontend Guide](Frontend-Guide) | You are working in `frontend/` |
| [Operations & Observability](Operations-and-Observability) | You are deploying, monitoring, or debugging prod |

## Non-negotiables

Three rules break production or leak data when ignored. Every page below repeats them in context:

1. **Every query filters by `workspaceId`.** Tenant isolation is not optional — see [Multi-Tenancy & RBAC](Multi-Tenancy-and-RBAC).
2. **Schema changes only via TypeORM migrations.** `synchronize` is `false` — see [Data Model & Migrations](Data-Model-and-Migrations).
3. **Uploads and financial writes are idempotent.** SHA-256 file hashes and `Idempotency-Key` — see [API Conventions](API-Conventions).

## Conventions this wiki assumes

- Backend: NestJS 11 + TypeORM + PostgreSQL + Redis, `backend/`
- Frontend: Next.js 16 App Router + React 19 + MUI, `frontend/`
- Lint/format: Biome (backend), Biome **and** ESLint (frontend — both run in CI)
- Commits: [Conventional Commits](https://www.conventionalcommits.org/), English only

Deeper machine-readable policy lives in `.claude/rules/*.md` in the repo. Those files are the source of truth when this wiki and they disagree.
