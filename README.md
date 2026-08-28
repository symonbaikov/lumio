<div align="center">
<img alt="White and Blue Simple Gradient Business Profile LinkedIn Banner" src="https://github.com/user-attachments/assets/5ca29e47-0fc1-470e-a09b-b2446dfb1579" />

---
  
<p align="center">
  :globe_with_meridians:<a href="#quick-start">Download</a>
</p>
---

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](CONTRIBUTING.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Open-source financial data platform for importing, processing, and analyzing bank statements**


[Quick Start](#quick-start) • [Features](#features) • [Tech Stack](#tech-stack) • [Architecture](#architecture) • [Contributing](CONTRIBUTING.md)

</div>
<img width="1920" height="917" alt="Screenshot_20260828_141321" src="https://github.com/user-attachments/assets/a252b1d0-bc05-42dd-8479-0d29b064f2f6" />


---

[![Maintainability](https://qlty.sh/gh/symonbaikov/projects/lumio/maintainability.svg)](https://qlty.sh/gh/symonbaikov/projects/lumio)
[![Code Coverage](https://qlty.sh/gh/symonbaikov/projects/lumio/coverage.svg)](https://qlty.sh/gh/symonbaikov/projects/lumio)
[![GitHub Stars](https://img.shields.io/github/stars/symonbaikov/lumio?style=flat-square&logo=github)](https://github.com/symonbaikov/lumio/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/symonbaikov/lumio?style=flat-square&logo=github)](https://github.com/symonbaikov/lumio/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/symonbaikov/lumio?style=flat-square&logo=github)](https://github.com/symonbaikov/lumio/issues)

---

> **TL;DR**
>
> - Upload bank statements (PDF / CSV / XLSX / image) → auto-parse → deduplicate → AI-categorize
> - Multi-tenant workspaces with RBAC, audit log, and one-click rollback
> - Full stack running locally in one command: `npm run setup:dev`
>
> Built for finance teams, accountants, and developers who need to process and analyze bank statement data without proprietary SaaS lock-in.

---
> ⚠️ The demo GIF and screenshots are based on **v1** and will be updated soon.

<p align="center">
  <a href="https://bank.gov.ua/en/news/all/natsionalniy-bank-vidkriv-rahunok-dlya-gumanitarnoyi-dopomogi-ukrayintsyam-postrajdalim-vid-rosiyskoyi-agresiyi" target="_blank">
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Ukraine.svg"
      alt="Ukraine Flag"
      width="520"
      height="120"
    /><br/>
    <strong>Humanitarian Aid for Ukraine</strong><br/>
    Support humanitarian relief via the official National Bank of Ukraine account.
  </a>
</p>


---

## Why Lumio exists

Lumio turns unstructured financial documents (PDFs, CSVs, email receipts) into clean, queryable data. Open-source, self-hosted, and built for teams that need control over their financial data pipeline.

---

## Features

Lumio is a full-stack financial operations platform built for teams that need to import, categorize, analyze, and collaborate on bank statement data.

### Core capabilities

- **Multi-format Statement Import** — PDF, CSV, XLSX, and image files. Native parsers for Kaspi Bank, Bereke Bank, and Bank Hapoalim / Isracard. Generic AI PDF parser for any other bank.
- **OCR for Image Statements** — Tesseract.js text extraction from scanned documents and photos.
- **Idempotent Uploads** — SHA-256 file hashing prevents duplicate imports.
- **Transaction Deduplication** — Fingerprint-based duplicate detection with confidence scoring, merge, and mark-as-duplicate workflows.
- **AI Auto-Categorization** — OpenAI-compatible local/provider endpoint with per-workspace learning rules.
- **Multi-Tenant Workspaces** — Unlimited workspaces with invitation flows and per-workspace data isolation.
- **Granular RBAC** — Roles: owner, admin, member, viewer. Per-user permission overrides.
- **Dashboard & Reports** — Cash flow, top categories, trends, custom report builder with CSV/XLSX export.
- **Audit Log** — Complete event trail with one-click rollback for supported operations.
- **Webhooks** — Outbound event delivery to subscribed endpoints with token-based authentication.
- **API Keys** — Programmatic access via `lum_`-prefixed, SHA-256 hashed keys with revocation support.
- **Budgets** — Budget tracking with manual spend recording and alerts.
- **Subscriptions** — Recurring billing detection and management with frequency-based tracking.
- **Goals & Net Worth** — Savings goals with progress tracking, and net worth aggregated across accounts, wallets, and crypto holdings.
- **Crypto Portfolio** — Crypto holdings with price and wallet sync, and transfer mapping into transactions.
- **AI Chat & Semantic Search** — Ask questions about your data; embeddings-backed transaction search plus a global cross-entity search.
- **Tax Engine** — Tax rates, rules, jurisdictions, thresholds, and tax return generation.
- **Backups** — Scheduled encrypted backups with export, import, and restore.
- **Docker Ready** — One-command deployment with Docker Compose.

<details>
<summary><b>Extended modules</b></summary>

### Intelligence

- **ML Categorization Rules** — `CategoryLearning` remembers per-workspace merchant→category patterns and applies them automatically on future imports.
- **AI Financial Insights** — Automatically generated insights surfaced on the dashboard; dismissible per-user.
- **Generic AI PDF Parser** — an OpenAI-compatible endpoint extracts structured transaction data from any PDF when no native parser matches.

### Integrations

- **IMAP Receipts** — mailbox polling pulls email receipts, parses merchant/amount/tax/line-item data, links receipts to transactions.
- **S3-compatible Storage** — import and sync statement files with MinIO or another S3-compatible bucket.
- **WebDAV Storage** — import and sync statement files with Nextcloud or another WebDAV-compatible server.
- **Workbook Import** — export and import custom table data via XLSX, CSV, and ODS files.
- **Telegram Bot** — Scheduled financial reports delivered to a Telegram chat or channel.

### Collaboration & Access Control

- **Auth Sessions** — List and manage active login sessions per device. Revoke individual sessions or all at once.
- **Workspace Invitations** — Email invitation flow with token-based acceptance.

### Finance & Reporting

- **Balance Sheet** — Account-level balance tracking with historical snapshots and export.
- **Accounts Payable** — Pay-tab workflow for managing and tracking payable records.
- **Custom Tables** — User-defined data structures with typed columns, batch editing, formula support, and Sheets import.
- **Manual Data Entry** — Record cash expenses, income, and receipts manually with custom fields and file attachments.
- **Categories** — Hierarchical transaction categories with usage counts and enable/disable toggle.
- **Reference Data** — Tax rates, branches, and wallets for enriching transactions.
- **Exchange Rates** — Currency exchange rate tracking and management.

### Platform

- **File Storage** — Document store with folders, tags, versioning, per-file permissions, and expiring shared links.
- **In-App Notifications** — Real-time feed with per-category preferences and unread badge count.
- **WebSocket Support** — Live updates via Socket.IO for notifications and import progress.
- **Observability** — Prometheus metrics endpoint (`/api/v1/metrics`) with pre-built Grafana dashboards.
- **Guided Onboarding** — 10 interactive feature tours in English, Russian, and Kazakh.

</details>

---

## What Lumio is NOT

Setting expectations upfront:

- **Not a bank integration** — Lumio parses statement files you export from your bank. It does not connect to bank APIs or fetch transactions automatically.
- **Not a full general ledger** — There is no double-entry bookkeeping, chart of accounts, or journal entry workflow.
- **Not a filing service** — Lumio computes tax figures and generates tax return documents, but it does not submit anything to a tax authority on your behalf.
- **Not an invoicing tool** — There is no invoice creation, sending, or payment tracking.
- **Not a replacement for accounting software** — Think of Lumio as the import and analysis layer that feeds your existing workflow, not a replacement for QuickBooks, Xero, or 1C.

---

## Supported Banks

| Bank | Format | Parser |
|---|---|---|
| Kaspi Bank | PDF | `KaspiParser` — native table extraction |
| Bereke Bank (new format) | PDF | `BerekeNewParser` — native |
| Bereke Bank (legacy format) | PDF | `BerekeOldParser` — native |
| Bank Hapoalim / Isracard | PDF | `HapoalimParser` — native (Hebrew) |
| Any bank | CSV | `CsvParser` — generic delimiter detection |
| Any bank | XLSX / XLS | `ExcelParser` — generic |
| Any bank | DOCX | `DocxParser` — generic table extraction |
| Any bank | PDF | `GenericPdfParser` — AI-assisted via OpenAI-compatible endpoint |
| Any bank | Image (PNG / JPG) | OCR pipeline via Tesseract.js |

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Framework | [NestJS 11](https://nestjs.com/) |
| Language | TypeScript 5 (strict) |
| Database | [PostgreSQL 14](https://www.postgresql.org/) via [TypeORM 0.3](https://typeorm.io/) |
| Cache | [Redis 7](https://redis.io/) via `cache-manager` |
| Auth | JWT (access 1 h / refresh 30 d), Passport.js, bcrypt |
| File Processing | pdf-parse, pdf-lib, tesseract.js v5, sharp, xlsx |
| AI / LLM | OpenAI-compatible HTTP endpoint (Ollama, LocalAI, vLLM) |
| Email | SMTP via nodemailer + React Email templates |
| Real-time | Socket.IO 4 + @nestjs/websockets |
| Scheduling | @nestjs/schedule (cron jobs for Telegram reports, backups, crypto sync) |
| Metrics | prom-client (Prometheus) |
| Validation | class-validator + class-transformer (DTOs) |
| API Docs | Swagger / OpenAPI at `/api/docs` |
| Linter | [Biome](https://biomejs.dev/) |

### Frontend

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Runtime | React 19 |
| Language | TypeScript 5 |
| Styling | MUI v7 + Emotion |
| Icons | Lucide React |
| Tables | TanStack Table v8 + TanStack Virtual v3 |
| Charts | ECharts v6 + echarts-for-react |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| HTTP | Axios v1 |
| Real-time | socket.io-client v4 |
| i18n | Intlayer v7 + next-intlayer (English, Russian, Kazakh) |
| Onboarding | driver.js |
| PDF Viewer | react-pdf v10 |
| Animation | framer-motion v12 |
| Tests | Vitest v4 |

### Infrastructure

| Layer | Technology |
|---|---|
| Containerization | Docker + Docker Compose |
| Monitoring | Prometheus + Grafana |
| CI/CD | GitHub Actions (CI, CD, CodeQL, dependency-review, Scorecard, release-please) |

---

## Repository Structure

```
lumio/
├── backend/                         # NestJS API server
│   ├── src/
│   │   ├── modules/                 # 43 feature modules
│   │   │   ├── api-keys/            # Programmatic API key management
│   │   │   ├── application-settings/ # Runtime system configuration
│   │   │   ├── auth/                # JWT auth, refresh tokens, session management
│   │   │   ├── users/               # User CRUD, avatars, permission overrides
│   │   │   ├── workspaces/          # Multi-tenant workspaces, RBAC, invitations
│   │   │   ├── statements/          # Bank statement upload & lifecycle management
│   │   │   ├── transactions/        # Transaction CRUD, search, deduplication
│   │   │   ├── categories/          # Hierarchical category management
│   │   │   ├── classification/      # AI auto-categorization + ML learning rules
│   │   │   ├── parsing/             # Multi-format file parsers (Kaspi, Bereke, Hapoalim, CSV, AI)
│   │   │   ├── dashboard/           # Dashboard stats, trends, cash flow
│   │   │   ├── reports/             # Financial reports, export (CSV/XLSX)
│   │   │   ├── balance/             # Balance sheet accounts & snapshots
│   │   │   ├── budgets/             # Budget tracking & alerts
│   │   │   ├── storage/             # File storage, versioning, shared links
│   │   │   ├── gmail/               # Legacy receipt sync & parsing
│   │   │   ├── google-drive/        # Legacy Drive migration compatibility
│   │   │   ├── google-sheets/       # Legacy Sheets migration compatibility
│   │   │   ├── dropbox/             # Legacy Dropbox migration compatibility
│   │   │   ├── exchange-rates/      # Currency exchange rate management
│   │   │   ├── telegram/            # Telegram bot, scheduled reports
│   │   │   ├── custom-tables/       # User-defined data structures
│   │   │   ├── data-entry/          # Manual expense/income entry
│   │   │   ├── notifications/       # In-app notifications & preferences
│   │   │   ├── insights/            # AI-generated financial insights
│   │   │   ├── audit/               # Audit log with rollback
│   │   │   ├── import/              # Import session tracking
│   │   │   ├── branches/            # Branch reference data
│   │   │   ├── wallets/             # Wallet reference data
│   │   │   ├── tax/                 # Tax rates, rules, jurisdictions, tax returns
│   │   │   ├── payables/            # Accounts payable workflow
│   │   │   ├── receipts/            # Receipt management & browser
│   │   │   ├── subscriptions/       # Recurring billing detection & management
│   │   │   ├── webhooks/            # Outbound event delivery to endpoints
│   │   │   ├── open-protocol-integrations/ # S3, WebDAV, IMAP protocol handlers
│   │   │   ├── ai-analysis/         # AI chat, embeddings, semantic transaction search
│   │   │   ├── search/              # Global cross-entity search
│   │   │   ├── crypto/              # Crypto holdings, price and wallet sync
│   │   │   ├── goals/               # Savings / financial goals
│   │   │   ├── net-worth/           # Net worth aggregation across accounts
│   │   │   ├── backups/             # Encrypted scheduled backups, export & restore
│   │   │   ├── mailer/              # Transactional email delivery
│   │   │   └── observability/       # Prometheus metrics endpoint
│   │   ├── entities/                # 77 TypeORM entities
│   │   ├── common/                  # Guards, decorators, interceptors, filters
│   │   ├── config/                  # App configuration
│   │   └── migrations/              # 131 database migrations (auto-applied on startup)
│   ├── scripts/                     # Admin, seed, parse debug, storage repair
│   └── @tests/                      # Unit and E2E test suites
├── frontend/                        # Next.js application
│   ├── app/
│   │   ├── (auth)/                  # Login, register pages
│   │   ├── (onboarding)/            # Onboarding flow
│   │   ├── (main)/                  # Protected app routes
│   │   │   ├── dashboard/           # Dashboard
│   │   │   ├── statements/          # Statement list, detail, reports sub-routes
│   │   │   ├── reports/             # Financial reports
│   │   │   ├── budgets/             # Budget tracking
│   │   │   ├── goals/               # Financial goals
│   │   │   ├── net-worth/           # Net worth overview
│   │   │   ├── crypto/              # Crypto portfolio
│   │   │   ├── subscriptions/       # Recurring billing
│   │   │   ├── roi/                 # ROI analysis
│   │   │   ├── advice/              # AI advice
│   │   │   ├── ai-analysis/         # AI chat over your data
│   │   │   ├── custom-tables/       # Custom table UI
│   │   │   ├── workspaces/          # Workspace management
│   │   │   └── supported-banks/     # Supported banks reference page
│   │   ├── categories/              # Category management
│   │   ├── chat/                    # AI chat UI
│   │   ├── integrations/            # Integration hub (S3, WebDAV, IMAP, workbook import)
│   │   ├── storage/                 # File storage browser
│   │   ├── settings/                # Profile, notifications, workspace, Telegram
│   │   ├── audit/                   # Audit log viewer
│   │   ├── admin/                   # Admin dashboard & user management
│   │   ├── transactions/            # Transaction list & detail
│   │   ├── upload/                  # Statement upload flow
│   │   ├── components/              # Reusable React components
│   │   ├── hooks/                   # Custom hooks (useAuth, etc.)
│   │   └── tours/                   # driver.js guided tour definitions
│   └── public/                      # Static assets, bank logos
├── docs/
│   ├── plans/                       # 35 feature design & implementation plans
│   ├── CI/                          # CI/CD pipeline documentation
│   ├── security/                    # CVE allowlists, license exceptions
│   └── statements-examples/         # Sample bank statement files for testing
├── electron/                        # Electron desktop app wrapper
├── mcp-server/                      # Claude MCP server integration
├── website/                         # Marketing / documentation website
├── observability/                   # Prometheus & Grafana configuration
├── scripts/                         # Shell helper scripts
│   ├── generate-env.sh              # Generate .env files with random secrets
│   └── generate-changelog.mjs       # Changelog generation script
├── docker-compose.yml               # Production Docker config (4 services)
├── docker-compose.dev.yml           # Development overrides with hot reload
├── docker-compose.observability.yml # Prometheus + Grafana monitoring stack
└── Makefile                         # All development commands
```

---

## Quick Start

### Prerequisites

Choose the startup mode that matches your machine:

| Mode | Command | Requirements | Best for |
|---|---|---|---|
| Interactive | `npm run setup:dev` | Node.js 20+; Docker optional depending on selected mode | First run; lets you choose a mode |
| Docker full-stack | `npm run setup:dev:docker` | Docker Desktop or Docker Engine with Compose | Fastest fresh-clone path |
| Local app + Docker infra | `npm run setup:dev:local` | Node.js 20+, npm, Docker Compose | Running backend/frontend on your host |
| Native no-Docker | `npm run setup:dev:native` | Node.js 20+, npm, local PostgreSQL, local Redis, `psql`, `redis-cli` | Contributors who do not want Docker |
| Env only | `npm run setup:env` | Node.js 20+ | Preparing `.env` files without starting services |

### One-command development startup

```bash
git clone https://github.com/symonbaikov/lumio.git
cd lumio
npm run setup:dev
```

`npm run setup:dev` asks which development mode you want, then prepares env files, starts PostgreSQL and Redis, runs database migrations, seeds a demo user, and starts the app.

### Fast bootstrap checklist (new contributor flow)

1. Install Node.js 20+ and Docker (with Compose) before you start.
2. Ensure ports are free: `3000` (frontend), `3001` (backend).
3. Prepare environment files once:

```bash
npm run setup:env
```

4. Start using one of the non-interactive modes:

```bash
npm run setup:dev:docker  # full Docker stack (recommended for first run)
npm run setup:dev:local   # local app + Docker infra
```

5. Verify availability:

```bash
curl -sS http://localhost:3001/api/v1/health/ready
open http://localhost:3000
```

Expected output from step 5 health check:

```json
{"status":"ok","checks":{"db":"ok"}}
```

Default demo login is printed after startup in the terminal:

- **Email:** `demo@lumio.dev`
- **Password:** `demo123`

To stop Docker mode cleanly:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

To stop local mode, press `Ctrl + C` in the terminal running `npm run setup:dev:local`.

For a new contributor, Docker full-stack is the recommended path. It builds and runs PostgreSQL, Redis, backend, and frontend, waits for backend readiness, seeds the demo account, and prints the URLs and login credentials.

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api/v1
- **Swagger Docs:** http://localhost:3001/api/docs

Demo credentials:
- **Email:** `demo@lumio.dev`
- **Password:** `demo123`

### Non-interactive startup

```bash
npm run setup:dev:docker  # Full Docker dev stack
npm run setup:dev:local   # Local backend/frontend + Docker PostgreSQL/Redis
npm run setup:dev:native  # Local backend/frontend + local PostgreSQL/Redis, no Docker
npm run setup:env         # Only create or complete local env files
```

`make quick-dev` remains available as a compatibility alias for `npm run setup:dev:docker`.

Development env files are generated locally and ignored by git. Existing values are preserved; missing defaults are appended. For production and optional integrations, see [Configuration](#configuration).

What the bootstrap script handles:

- Detects `docker compose` vs `docker-compose`.
- Creates missing `.env`, `backend/.env`, and `frontend/.env.local` values without overwriting existing local values.
- Uses development defaults: PostgreSQL user/password/database `finflow`, PostgreSQL port `5434`, Redis port `6379`, and generated JWT/encryption secrets.
- Runs migrations and demo seed automatically.
- Prints actionable errors for missing Docker daemon, missing native tools, and occupied ports.

### Native Development Without Docker

Native mode does not use Docker. It expects local PostgreSQL and Redis to be installed and running, with `psql` and `redis-cli` available on `PATH`.

```bash
npm run setup:dev:native
```

The command prepares env files, creates the configured PostgreSQL role/database when your local Postgres user has permission, verifies Redis, installs missing npm dependencies, runs migrations, seeds the demo user, and starts backend/frontend in the foreground.

By default, generated development env points PostgreSQL to `localhost:5434` and Redis to `localhost:6379`. If your local PostgreSQL uses the standard port, set `POSTGRES_PORT=5432` in `.env` and update `backend/.env` `DATABASE_URL` before running native mode.

If native prerequisites are missing, the command stops before starting the app and reports the missing tool, for example `redis-cli`.

### Verified Startup Paths

The development bootstrap supports and tests these paths:

- `npm run setup:dev:docker` — full Docker stack, including backend readiness and demo seed.
- `npm run setup:dev:local` — local backend/frontend with Docker PostgreSQL and Redis.
- `npm run setup:dev:native` — local backend/frontend with local PostgreSQL and Redis; requires native database/cache tools installed first.

---

## Service URLs

| Service | URL | Notes |
|---|---|---|
| Frontend | http://localhost:3000 | Next.js app |
| Backend API | http://localhost:3001/api/v1 | All REST endpoints |
| Swagger Docs | http://localhost:3001/api/docs | Interactive API explorer |
| Prometheus | http://localhost:9090 | `make observability` |
| Grafana | http://localhost:3002 | `make observability` · `admin` / `admin` |

---

## Configuration

### Development Defaults

No manual environment setup is required for development. `npm run setup:dev` creates ignored local env files and preserves any values you already set.

| Setting | Default Value |
|---|---|
| `DATABASE_URL` | `postgresql://finflow:finflow@localhost:5434/finflow` |
| `POSTGRES_PORT` | `5434` |
| `REDIS_URL` | `redis://localhost:6379` |
| `REDIS_PORT` | `6379` |
| `PORT` | `3001` |
| `JWT_SECRET` | Generated local dev secret |
| `JWT_REFRESH_SECRET` | Generated local dev secret |
| `INTEGRATIONS_ENCRYPTION_KEY` | Generated local dev secret |
| `JWT_EXPIRES_IN` | `30d` |
| `JWT_REFRESH_EXPIRES_IN` | `30d` |

To override backend values, edit `backend/.env`. Frontend overrides go in `frontend/.env.local`.

### Production Required Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `NEXT_PUBLIC_API_URL` | Backend API URL seen by the browser |

Generate secure secrets with:

```bash
openssl rand -base64 32
# or use the helper script which sets up all env files at once:
bash scripts/generate-env.sh
```

### Optional Integrations

<details>
<summary><b>Open Protocol Storage & Mail</b></summary>

Use open protocols and self-hostable services for file sync and receipt import.

Configure S3-compatible storage, WebDAV storage, and IMAP inboxes from **Integrations**. Server env variables are only a temporary fallback for bootstrap or migration.
</details>

<details>
<summary><b>AI Auto-Categorization & Generic PDF Parsing</b></summary>

Point Lumio at an OpenAI-compatible endpoint from **Integrations → AI-compatible endpoint**. `AI_API_KEY` may be omitted for local endpoints that do not require authentication. Env values remain supported only as server defaults.
</details>

<details>
<summary><b>Dependency Policy</b></summary>

Do not add closed SaaS SDKs for new integration work. Prefer OSS libraries that implement open protocols such as SMTP, IMAP, WebDAV, S3-compatible object storage, and OpenAI-compatible local inference.
</details>

<details>
<summary><b>Telegram Bot</b></summary>

Get a token from [@BotFather](https://t.me/botfather), then save the bot token in **Settings → Telegram**. The token is stored encrypted; `TELEGRAM_BOT_TOKEN` is only a fallback server default.
</details>

<details>
<summary><b>Email (SMTP)</b></summary>

Used for workspace invitation emails. Configure SMTP from **Integrations → SMTP email**. If neither UI settings nor env fallback are configured, invitation links are returned in the API response but no email is sent.
</details>

---

## User Management

### Demo User

```bash
make seed-demo
```

Creates `demo@lumio.dev` with password `demo123` and a sample workspace with demo transactions.

### Create Admin User

```bash
# Using Makefile (works with Docker or locally)
make admin email=admin@example.com password=admin123 name="Admin User"

# Using Docker exec directly
docker exec -it finflow-backend npm run create-admin -- admin@example.com admin123 "Admin User"

# Local (no Docker)
cd backend && npm run create-admin -- admin@example.com admin123 "Admin User"
```

Admin users have access to the `/admin` dashboard with full user management and system stats.

---

## Development

### Makefile Reference

All common tasks are available via `make`. Run `make help` to see the full list with descriptions.

**Setup & Services**

```bash
npm run setup:dev      # Interactive one-command development startup (recommended entry point)
npm run setup:dev:docker # Non-interactive full Docker development startup
npm run setup:dev:local  # Non-interactive local app + Docker infra startup
npm run setup:dev:native # Non-interactive local app + local infra startup, no Docker
npm run setup:env      # Create or complete ignored local env files only
make quick-dev         # Compatibility alias for npm run setup:dev:docker
make setup             # Compatibility alias for npm run setup:env
make install           # Install npm dependencies locally (no Docker)
make dev               # Start all services in development mode (hot reload)
make start             # Start all services in production mode
make stop              # Stop all services
make restart           # Restart all services
make clean             # Stop services and remove all Docker volumes
make reset             # clean + setup + start (full environment reset)
make ps                # Show running containers
make stats             # Show container CPU/memory usage
make health            # Check health of all services
```

**Logs**

```bash
make logs              # Tail logs from all services
make logs-backend      # Backend logs only
make logs-frontend     # Frontend logs only
make logs-db           # PostgreSQL logs
make logs-redis        # Redis logs
```

**Database**

```bash
make migrate                           # Run pending migrations (Docker)
make migrate-revert                    # Revert last applied migration
make migrate-generate name=MyMigration # Generate new migration after entity changes
make db-start                          # Start PostgreSQL + Redis only (for local dev)
make db-shell                          # Open psql shell
make db-backup                         # Dump database to .sql file
make db-restore file=backup.sql        # Restore database from backup
```

**Testing**

```bash
make test              # Run all tests (backend + frontend)
make test-backend      # Backend unit tests only
make test-frontend     # Frontend Vitest tests only
make test-watch        # Backend tests in watch mode
make test-cov          # Backend tests with coverage report
make test-e2e          # End-to-end tests
```

**Code Quality**

```bash
make lint              # Run Biome linter with auto-fix
make lint-check        # Check lint without auto-fix
make format            # Format code with Biome
make type-check        # TypeScript type checking
make build             # Build backend + frontend for production
make build-docker      # Build Docker images
```

**Monitoring**

```bash
make observability     # Start Prometheus + Grafana
make observability-stop # Stop monitoring stack
```

**Utilities**

```bash
make shell-backend     # Open bash shell in backend container
make shell-frontend    # Open sh shell in frontend container
make shell-db          # Open bash shell in database container
make docs              # Open Swagger docs in browser
make seed-demo         # Create demo user with sample data
make admin email=X password=X name=X  # Create admin user
make update            # Update npm dependencies
```

### Database Migrations

Lumio uses TypeORM migrations exclusively (`synchronize: false`). Migrations run automatically on every startup unless `RUN_MIGRATIONS=false` is set. There are currently 131 migrations covering the entire schema history.

```bash
# Apply all pending migrations (Docker)
make migrate

# Apply all pending migrations (local)
cd backend && npm run migration:run

# Generate a new migration after changing an entity
make migrate-generate name=AddTransactionMerchantColumn
# or locally:
cd backend && npm run migration:generate -- AddTransactionMerchantColumn

# Revert the last applied migration
make migrate-revert
```

### Parser Debugging Scripts

```bash
cd backend

# Debug parsing output for a specific file
npm run parse:debug -- /path/to/statement.pdf

# Dump raw PDF table structure (useful for new bank formats)
npm run parse:tables -- /path/to/statement.pdf

# Compare parsing output between two files
npm run parse:diff -- /path/to/old.pdf /path/to/new.pdf

# Verify storage integrity (check for orphaned files)
npm run storage:verify

# Repair storage (remove orphaned files)
npm run storage:repair

# Clean up old Gmail receipt processing jobs
npm run cleanup:gmail-receipts
```

### Hot Reload

```bash
npm run setup:dev:docker
# uses:
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Source file changes automatically reload both backend (ts-node watch) and frontend (Next.js HMR).

### Startup Troubleshooting

- **Docker daemon unavailable:** start Docker Desktop or Docker Engine, then rerun `npm run setup:dev`. The bootstrap script checks daemon reachability before running Compose.
- **Docker Compose command not found:** install Docker Compose v2. The bootstrap script prefers `docker compose` and falls back to `docker-compose` when available.
- **No Docker wanted:** run `npm run setup:dev:native` with local PostgreSQL and Redis already running. The script checks `psql` and `redis-cli` before touching the app.
- **Port already in use:** free ports `3000` and `3001` for local app mode. For PostgreSQL or Redis conflicts, change `POSTGRES_PORT` or `REDIS_PORT` in `.env`.
- **Reset local Docker data:** run `make clean`, then rerun `npm run setup:dev`.

---

## Testing

### Backend Tests

```bash
cd backend

npm test               # All unit tests
npm run test:watch     # Watch mode
npm run test:cov       # With coverage report (goal: 80%+)
npm run test:e2e       # End-to-end tests
npm run test:golden    # Parser golden file tests (deterministic output verification)
npm run test:ci        # Unit + E2E (sequential, used in CI)
```

Coverage report is written to `backend/coverage/lcov-report/index.html`.

Test files live in `backend/@tests/unit/` (unit) and `backend/@tests/e2e/` (E2E), using the `*.spec.ts` naming convention.

### Frontend Tests

```bash
cd frontend

npm test               # Run all tests with Vitest
```

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser / Client                        │
└────────────┬────────────────────────────────────┬───────────────┘
             │                                    │
             │ HTTP/WebSocket                     │ HTTP
             │                                    │
┌────────────▼────────────┐         ┌────────────▼───────────────┐
│   Next.js Frontend      │         │   External Integrations     │
│   (Port 3000)           │         │  - SMTP / IMAP              │
│                         │         │  - S3-compatible storage    │
│  - App Router           │         │  - WebDAV storage           │
│  - React 19             │         │  - Workbook files           │
│  - MUI + Emotion        │         │  - Telegram Bot             │
│  - Real-time updates    │         │  - OpenAI-compatible AI     │
└────────────┬────────────┘         └─────────────────────────────┘
             │
             │ REST API (/api/v1)
             │ WebSocket (Socket.IO)
             │
┌────────────▼─────────────────────────────────────────────────────┐
│              NestJS Backend (Port 3001)                          │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Auth & RBAC    │  │   Parsing    │  │  Classification  │  │
│  │  - JWT          │  │  - Kaspi     │  │  - AI Auto-Cat   │  │
│  │  - Sessions     │  │  - Bereke    │  │  - ML Rules      │  │
│  │  - Permissions  │  │  - CSV/XLSX  │  │  - Learning      │  │
│  └─────────────────┘  │  - Generic   │  └──────────────────┘  │
│                       │  - OCR       │                          │
│  ┌─────────────────┐  └──────────────┘  ┌──────────────────┐  │
│  │  Transactions   │                    │   Workspaces     │  │
│  │  - CRUD         │  ┌──────────────┐  │  - Multi-tenant  │  │
│  │  - Dedup        │  │  Reports &   │  │  - Invitations   │  │
│  │  - Search       │  │  Dashboard   │  │  - RBAC          │  │
│  └─────────────────┘  │  - Cash flow │  └──────────────────┘  │
│                       │  - Export    │                          │
│  ┌─────────────────┐  └──────────────┘  ┌──────────────────┐  │
│  │  Audit Log      │                    │   Storage &      │  │
│  │  - Events       │  ┌──────────────┐  │   Files          │  │
│  │  - Rollback     │  │ Integrations │  │  - Versions      │  │
│  └─────────────────┘  │ - Gmail      │  │  - Shared links  │  │
│                       │ - Drive      │  └──────────────────┘  │
│                       │ - Sheets     │                          │
│                       └──────────────┘                          │
└──────────┬────────────────────────────┬─────────────────────────┘
           │                            │
           │                            │
┌──────────▼────────────┐   ┌──────────▼────────────┐
│   PostgreSQL 14       │   │     Redis 7           │
│                       │   │                       │
│  - 77 TypeORM entities│   │  - Session cache      │
│  - 131 migrations     │   │  - Rate limiting      │
│  - Full-text search   │   │  - Bull queues        │
└───────────────────────┘   └───────────────────────┘

                ┌─────────────────────────┐
                │   Observability         │
                │                         │
                │  - Prometheus (metrics) │
                │  - Grafana (dashboards) │
                └─────────────────────────┘
```

### API Design

- All endpoints are prefixed `/api/v1`
- Global `JwtAuthGuard` — use `@Public()` decorator to opt out for public endpoints
- Global `ThrottlerGuard` — 100 req/hour unauthenticated, 500 req/min authenticated
- `@RequirePermission()` + `PermissionsGuard` for fine-grained RBAC checks
- `@Audit()` decorator on mutating operations for automatic audit-log recording
- `@CurrentUser()` and `@WorkspaceId()` parameter decorators for clean controller code
- Structured JSON logging with per-request correlation IDs
- Global validation pipe with `class-validator` DTOs on all inputs
- Max upload size: 10 MB · PDF parsing timeout: 30 s · Max parallel file uploads: 5

### Database

- TypeORM with `synchronize: false` — schema changes only via numbered migrations
- Soft delete on statements via `deletedAt` timestamp
- SHA-256 `fileHash` on statements for idempotent re-upload detection
- `Idempotency-Key` header supported on upload endpoints (stored in `IdempotencyKey` entity)
- Transaction fingerprinting for cross-statement duplicate detection
- 77 TypeORM entities covering all domain objects (see `backend/src/entities/`)

### Parsing Pipeline

```
Upload request
  → SHA-256 hash check (idempotency)
  → ParserFactory (detects bank + file type)
      ├── KaspiParser        (Kaspi Bank PDF)
      ├── BerekeNewParser    (Bereke Bank new format PDF)
      ├── BerekeOldParser    (Bereke Bank legacy PDF)
      ├── ExcelParser        (XLSX / XLS)
      ├── CsvParser          (CSV)
      ├── GenericPdfParser   (AI-assisted: OpenAI-compatible endpoint)
      └── OCR Pipeline       (Tesseract.js for images)
  → ImportSession created (status: processing)
  → Transactions persisted
  → ClassificationService (AI categorization + ML rules)
  → DeduplicationService (fingerprint check)
  → ImportSession status: complete
```

### Security Model

- JWT access tokens (1 h) + refresh tokens (30 d) stored per-device in `AuthSession`
- Refresh token rotation on every use; old tokens invalidated
- Bcrypt password hashing (12 rounds)
- RBAC enforced at controller level via guards — workspace roles enforced on every request
- Audit log covers all mutating operations with rollback support for critical changes
- CVE allowlists and license exceptions documented in `docs/security/`
- See [SECURITY.md](SECURITY.md) for the full security policy

### Code Conventions

- Controllers are thin — all business logic in Services
- DTOs with `class-validator` decorators for all inputs
- TypeORM migrations only — never `synchronize: true`
- `file_hash` (SHA-256) for idempotent file operations
- Structured JSON logging with correlation IDs
- All code comments and commit messages in English
- Biome formatter: 2 spaces, single quotes, semicolons, 100-char line width

---

## Monitoring & Observability

```bash
make observability        # Start Prometheus + Grafana
make observability-stop   # Stop monitoring stack
```

| Tool | URL | Purpose |
|---|---|---|
| Prometheus | http://localhost:9090 | Metrics collection and querying |
| Grafana | http://localhost:3002 | Pre-configured dashboards, default `admin` / `admin` |
| Metrics endpoint | http://localhost:3001/api/v1/metrics | Raw Prometheus metrics |

Configuration files are in `observability/`:
- `prometheus.yml` — scrape config (polls `/api/v1/metrics` every 15 s)
- `grafana/` — Grafana datasource and dashboard JSON files

---

## Deployment

### Docker Production

```bash
# Build and start all services
docker compose up -d --build

# Check service status
docker compose ps

# Tail logs
docker compose logs -f

# Stop everything
docker compose down
```

Docker Compose runs four services: `postgres` (PostgreSQL 14-alpine), `redis` (Redis 7-alpine), `backend` (NestJS), and `frontend` (Next.js). Data is persisted in named volumes (`postgres_data`, `redis_data`, `backend_uploads`).

### Railway

Lumio can be deployed to [Railway](https://railway.app/) with automatic migrations on every deploy:

1. Push to GitHub
2. Connect Railway to your repository
3. Set required environment variables (see [Configuration](#configuration))
4. Deploys automatically on push to `main`

See [RAILWAY.md](RAILWAY.md) for step-by-step instructions.

### Environment-Specific Compose Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | Production configuration |
| `docker-compose.dev.yml` | Development overrides (hot reload, source mounts) |
| `docker-compose.observability.yml` | Prometheus + Grafana monitoring stack |

---

## Documentation

| Document | Description |
|---|---|
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute — workflow, code style, PR process |
| [SECURITY.md](SECURITY.md) | Security policy, vulnerability reporting, disclosure process |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community guidelines |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [RAILWAY.md](RAILWAY.md) | Railway deployment step-by-step |
| [docs/plans/](docs/plans/) | 35 feature design and implementation plan documents |
| [docs/CI/](docs/CI/) | CI/CD pipeline documentation |
| [docs/security/](docs/security/) | CVE allowlists and license exceptions |

Interactive API documentation: http://localhost:3001/api/docs (when backend is running).

---

## Contributing

We welcome contributions from the community.

### Ways to Contribute

- **Report bugs** — use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml)
- **Suggest features** — use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml)
- **Improve documentation** — fix typos, clarify guides, add examples
- **Submit pull requests** — fix bugs, add features, write tests
- **Add bank parsers** — support new banks by implementing the parser interface
- **Translate** — help with English / Russian / Kazakh i18n content

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make changes and write or update tests
4. Run `make lint` and `make test` — both must pass
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat(statements): add CSV import support
   fix(auth): handle expired refresh token correctly
   docs: update quick-start instructions
   test(parsing): add golden tests for Bereke new format
   refactor(classification): extract learning rule application logic
   ```
6. Push and open a Pull Request against `main`

### Code Style

- TypeScript strict mode throughout
- [Biome](https://biomejs.dev/) for linting and formatting (2 spaces, single quotes, semicolons)
- Run `make lint` (and `make format` if needed) before committing
- Follow existing module patterns: thin controllers, logic in services, DTOs for all inputs

For detailed guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Community

- **GitHub Discussions** — ask questions, share ideas, get help
- **GitHub Issues** — report bugs or request features
- **Star this repo** — helps others discover the project

---

## Security

Security is a top priority. Please read [SECURITY.md](SECURITY.md) for supported versions, the vulnerability disclosure process, and security best practices.

**Found a security issue?** Report it privately through [GitHub Security Advisories](../../security/advisories/new), not in public issues.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

Built on great open-source foundations:

[NestJS](https://nestjs.com/) · [Next.js](https://nextjs.org/) · [PostgreSQL](https://www.postgresql.org/) · [TypeORM](https://typeorm.io/) · [Redis](https://redis.io/) · [MUI](https://mui.com/) · [Emotion](https://emotion.sh/) · [TanStack Table](https://tanstack.com/table) · [ECharts](https://echarts.apache.org/) · [Tesseract.js](https://tesseract.projectnaptha.com/) · [Socket.IO](https://socket.io/) · [Intlayer](https://intlayer.org/) · [driver.js](https://driverjs.com/) · [Biome](https://biomejs.dev/) · and many more.

---

<div align="center">

**[back to top](#lumio)**

Made with care by the Lumio community

</div>
