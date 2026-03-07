
<div align="center">
<img width="1984" height="696" alt="White and Blue Simple Gradient Business Profile LinkedIn Banner" src="https://github.com/user-attachments/assets/c4df04a1-234c-44c6-a033-beb7420d5296" />


---

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](CONTRIBUTING.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Open-source financial data platform for importing, processing, and analyzing bank statements**

[Quick Start](#quick-start) • [Features](#features) • [Tech Stack](#tech-stack) • [Architecture](#architecture) • [Contributing](CONTRIBUTING.md)

</div>
<img width="3808" height="1908" alt="CleanShot 2026-03-06 at 00 19 20@2x" src="https://github.com/user-attachments/assets/1e94ba9a-39c1-4f67-9609-df099514456e" />

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
> - Full stack running locally in one command: `make quick-dev`
>
> Built for finance teams, accountants, and developers who need to process and analyze bank statement data without proprietary SaaS lock-in.

---

## Screenshots

| Upload | Tables | Dashboard |
|--------|--------|-----------|
| ![Upload flow](docs/screenshots/upload.png) | ![Tables](docs/screenshots/tables.png) | ![Dashboard](docs/screenshots/dashboard.png) |

| Reports | Audit Log |
|---------|-----------|
| ![Reports](docs/screenshots/reports.png) | ![Audit Log](docs/screenshots/audit-log.png) |

<div align="center" width="100" height="100">
  
![CleanShot 2026-03-06 at 12 32 23](https://github.com/user-attachments/assets/69a32ee9-aa97-4395-a25f-3b8158e5574d)
  
</div>

> ⚠️ The demo GIF is based on **v1** and will be updated soon.

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

- **Multi-format Statement Import** — PDF, CSV, XLSX, and image files. Native parsers for Kaspi Bank and Bereke Bank. Generic AI PDF parser for any other bank.
- **OCR for Image Statements** — Tesseract.js text extraction from scanned documents and photos.
- **Idempotent Uploads** — SHA-256 file hashing prevents duplicate imports.
- **Transaction Deduplication** — Fingerprint-based duplicate detection with confidence scoring, merge, and mark-as-duplicate workflows.
- **AI Auto-Categorization** — OpenAI / Gemini / OpenRouter-backed categorization with per-workspace learning rules.
- **Multi-Tenant Workspaces** — Unlimited workspaces with invitation flows and per-workspace data isolation.
- **Granular RBAC** — Roles: owner, admin, member, viewer. Per-user permission overrides.
- **Dashboard & Reports** — Cash flow, top categories, trends, custom report builder with CSV/XLSX export.
- **Audit Log** — Complete event trail with one-click rollback for supported operations.
- **Docker Ready** — One-command deployment with Docker Compose.

<details>
<summary><b>Extended modules</b></summary>

### Intelligence

- **ML Categorization Rules** — `CategoryLearning` remembers per-workspace merchant→category patterns and applies them automatically on future imports.
- **AI Financial Insights** — Automatically generated insights surfaced on the dashboard; dismissible per-user.
- **Generic AI PDF Parser** — Gemini/OpenAI extracts structured transaction data from any PDF when no native parser matches.

### Integrations

- **Gmail Receipts** — OAuth Gmail sync: pulls email receipts, parses merchant/amount/tax/line-item data, links receipts to transactions.
- **Google Drive** — OAuth integration for importing statement files from Drive folders.
- **Dropbox** — OAuth integration for importing statement files from Dropbox.
- **Google Sheets** — Two-way sync: export transactions to Sheets; import Sheets data into custom tables.
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

### Platform

- **File Storage** — Document store with folders, tags, versioning, per-file permissions, and expiring shared links.
- **In-App Notifications** — Real-time feed with per-category preferences and unread badge count.
- **WebSocket Support** — Live updates via Socket.IO for notifications and import progress.
- **Observability** — Prometheus metrics endpoint (`/api/v1/metrics`) with pre-built Grafana dashboards.
- **Guided Onboarding** — 10 interactive feature tours in English, Russian, and Kazakh.
- **Storybook** — Component library with stories for every UI primitive; auto-built on every PR.

</details>

---

## What Lumio is NOT

Setting expectations upfront:

- **Not a bank integration** — Lumio parses statement files you export from your bank. It does not connect to bank APIs or fetch transactions automatically.
- **Not a full general ledger** — There is no double-entry bookkeeping, chart of accounts, or journal entry workflow.
- **Not a tax calculation engine** — Tax rates are reference data for enriching transactions; Lumio does not compute tax returns or filings.
- **Not an invoicing tool** — There is no invoice creation, sending, or payment tracking.
- **Not a replacement for accounting software** — Think of Lumio as the import and analysis layer that feeds your existing workflow, not a replacement for QuickBooks, Xero, or 1C.

---

## Supported Banks

| Bank | Format | Parser |
|---|---|---|
| Kaspi Bank | PDF | `KaspiParser` — native table extraction |
| Bereke Bank (new format) | PDF | `BerekeNewParser` — native |
| Bereke Bank (legacy format) | PDF | `BerekeOldParser` — native |
| Any bank | CSV | `CsvParser` — generic delimiter detection |
| Any bank | XLSX / XLS | `ExcelParser` — generic |
| Any bank | PDF | `GenericPdfParser` — AI-assisted via Gemini / OpenAI |
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
| File Processing | pdf-parse, pdf-lib, pdf2table, tesseract.js, sharp, xlsx |
| AI / LLM | OpenAI SDK v4, @google/generative-ai (Gemini), @openrouter/sdk |
| Email | [Resend](https://resend.com/) + React Email templates |
| Real-time | Socket.IO 4 + @nestjs/websockets |
| Scheduling | @nestjs/schedule (cron jobs for Telegram reports, Gmail sync) |
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
| Styling | TailwindCSS v4 |
| UI Libraries | Mantine v8, MUI v7, HeroUI v2 |
| Icons | Lucide React, MUI Icons, Iconify |
| Tables | TanStack Table v8 + TanStack Virtual v3 |
| Charts | ECharts v5 + echarts-for-react |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| HTTP | Axios v1 |
| Real-time | socket.io-client v4 |
| i18n | Intlayer v7 + next-intlayer (English, Russian, Kazakh) |
| Onboarding | driver.js |
| PDF Viewer | react-pdf v10 |
| Animation | framer-motion |
| Component Dev | Storybook v8 (webpack5) |
| Tests | Vitest v2 |

### Infrastructure

| Layer | Technology |
|---|---|
| Containerization | Docker + Docker Compose |
| Monitoring | Prometheus + Grafana |
| CI/CD | GitHub Actions (dependency-review, Trivy, Hadolint, SLSA, release-please) |

---

## Repository Structure

```
lumio/
├── backend/                         # NestJS API server
│   ├── src/
│   │   ├── modules/                 # 27 feature modules
│   │   │   ├── auth/                # JWT auth, refresh tokens, Google OAuth, session management
│   │   │   ├── users/               # User CRUD, avatars, permission overrides
│   │   │   ├── workspaces/          # Multi-tenant workspaces, RBAC, invitations
│   │   │   ├── statements/          # Bank statement upload & lifecycle management
│   │   │   ├── transactions/        # Transaction CRUD, search, deduplication
│   │   │   ├── categories/          # Hierarchical category management
│   │   │   ├── classification/      # AI auto-categorization + ML learning rules
│   │   │   ├── parsing/             # Multi-format file parsers (Kaspi, Bereke, CSV, AI)
│   │   │   ├── dashboard/           # Dashboard stats, trends, cash flow
│   │   │   ├── reports/             # Financial reports, export (CSV/XLSX)
│   │   │   ├── balance/             # Balance sheet accounts & snapshots
│   │   │   ├── storage/             # File storage, versioning, shared links
│   │   │   ├── gmail/               # Gmail OAuth, receipt sync & parsing
│   │   │   ├── google-drive/        # Google Drive OAuth & file import
│   │   │   ├── google-sheets/       # Google Sheets two-way sync
│   │   │   ├── dropbox/             # Dropbox OAuth & file import
│   │   │   ├── telegram/            # Telegram bot, scheduled reports
│   │   │   ├── custom-tables/       # User-defined data structures
│   │   │   ├── data-entry/          # Manual expense/income entry
│   │   │   ├── notifications/       # In-app notifications & preferences
│   │   │   ├── insights/            # AI-generated financial insights
│   │   │   ├── audit/               # Audit log with rollback
│   │   │   ├── import/              # Import session tracking
│   │   │   ├── branches/            # Branch reference data
│   │   │   ├── wallets/             # Wallet reference data
│   │   │   ├── tax-rates/           # Tax rate reference data
│   │   │   └── observability/       # Prometheus metrics endpoint
│   │   ├── entities/                # 50 TypeORM entities
│   │   ├── common/                  # Guards, decorators, interceptors, filters
│   │   ├── config/                  # App configuration
│   │   └── migrations/              # 64 database migrations (auto-applied on startup)
│   ├── scripts/                     # Admin, seed, parse debug, storage repair
│   └── @tests/                      # Unit and E2E test suites
├── frontend/                        # Next.js application
│   ├── app/
│   │   ├── (auth)/                  # Login, register pages
│   │   ├── (onboarding)/            # Onboarding flow
│   │   ├── (main)/                  # Protected app routes
│   │   │   ├── statements/          # Statement list, detail, reports sub-routes
│   │   │   ├── receipts/            # Gmail receipt browser
│   │   │   ├── reports/             # Financial reports
│   │   │   ├── custom-tables/       # Custom table UI
│   │   │   ├── workspaces/          # Workspace management
│   │   │   └── supported-banks/     # Supported banks reference page
│   │   ├── categories/              # Category management
│   │   ├── data-entry/              # Manual data entry UI
│   │   ├── integrations/            # Integration hub (Gmail, Drive, Dropbox, Sheets)
│   │   ├── storage/                 # File storage browser
│   │   ├── settings/                # Profile, notifications, workspace, Telegram
│   │   ├── audit/                   # Audit log viewer
│   │   ├── admin/                   # Admin dashboard & user management
│   │   ├── transactions/            # Transaction list & detail
│   │   ├── upload/                  # Statement upload flow
│   │   ├── components/              # Reusable React components
│   │   ├── hooks/                   # Custom hooks (useAuth, etc.)
│   │   ├── tours/                   # driver.js guided tour definitions
│   │   └── stories/                 # Storybook stories (*.stories.tsx)
│   └── public/                      # Static assets, bank logos
├── docs/
│   ├── plans/                       # 24 feature design & implementation plans
│   ├── CI/                          # CI/CD pipeline documentation
│   ├── security/                    # CVE allowlists, license exceptions
│   └── statements-examples/         # Sample bank statement files for testing
├── observability/                   # Prometheus & Grafana configuration
├── scripts/                         # Shell helper scripts
│   ├── generate-env.sh              # Generate .env files with random secrets
│   ├── storybook-download.sh        # Download Storybook from CI artifacts
│   ├── storybook-serve.sh           # Serve downloaded Storybook locally
│   └── generate-changelog.mjs       # Changelog generation script
├── docker-compose.yml               # Production Docker config (4 services)
├── docker-compose.dev.yml           # Development overrides with hot reload
├── docker-compose.observability.yml # Prometheus + Grafana monitoring stack
└── Makefile                         # All development commands
```

---

## Quick Start

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose (for Docker mode)
- [Node.js 20+](https://nodejs.org/) (only required for local mode without Docker)

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/symonbaikov/lumio.git
cd lumio
make quick-dev
```

`make quick-dev` does everything: copies env files, generates JWT secrets, starts all Docker services (postgres, redis, backend, frontend), runs database migrations, and seeds a demo user. Then open your browser:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api/v1
- **Swagger Docs:** http://localhost:3001/api/docs

Demo credentials:
- **Email:** `demo@lumio.dev`
- **Password:** `demo123`

### Option 2: Local Development (no Docker)

```bash
git clone https://github.com/symonbaikov/lumio.git
cd lumio

# Start only PostgreSQL and Redis via Docker
make db-start

# Install dependencies
npm install --prefix backend
npm install --prefix frontend

# Apply migrations and seed demo data
cd backend && npm run migration:run && npm run seed:demo

# Start backend and frontend in separate terminals
cd backend && npm run start:dev    # Terminal 1 — http://localhost:3001
cd frontend && npm run dev          # Terminal 2 — http://localhost:3000
```

No `.env` files are required in development. For production and optional integrations, see [Configuration](#configuration).

---

## Service URLs

| Service | URL | Notes |
|---|---|---|
| Frontend | http://localhost:3000 | Next.js app |
| Backend API | http://localhost:3001/api/v1 | All REST endpoints |
| Swagger Docs | http://localhost:3001/api/docs | Interactive API explorer |
| Storybook | http://localhost:6006 | `make storybook` |
| Prometheus | http://localhost:9090 | `make observability` |
| Grafana | http://localhost:3002 | `make observability` · `admin` / `admin` |

---

## Configuration

### Development Defaults

No environment variables are required in development mode. The backend uses sensible defaults.

| Setting | Default Value |
|---|---|
| `DATABASE_URL` | `postgresql://finflow:finflow@localhost:5432/finflow` |
| `REDIS_HOST` | `localhost` |
| `REDIS_PORT` | `6379` |
| `PORT` | `3001` |
| `JWT_SECRET` | Built-in dev default (disabled in production) |
| `JWT_REFRESH_SECRET` | Built-in dev default (disabled in production) |
| `JWT_EXPIRES_IN` | `1h` |
| `JWT_REFRESH_EXPIRES_IN` | `30d` |

To override any value, create `backend/.env`. A minimal template is available in `backend/.env.example`.
Frontend overrides go in `frontend/.env.local` (`frontend/.env.local.example` for the template).

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
<summary><b>Google OAuth, Drive & Sheets</b></summary>

Required for Google login, Gmail receipt sync, Drive import, and Sheets sync.

```bash
# backend/.env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v1/auth/google/callback

# frontend/.env.local
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/). Enable Gmail API, Drive API, and Sheets API in your project.
</details>

<details>
<summary><b>AI Auto-Categorization & Generic PDF Parsing</b></summary>

Provide at least one key. The system will fall back to the next available provider if one fails.

```bash
# backend/.env
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=your-gemini-api-key
OPENROUTER_API_KEY=your-openrouter-key
```
</details>

<details>
<summary><b>Dropbox</b></summary>

```bash
# backend/.env
DROPBOX_CLIENT_ID=your-app-key
DROPBOX_CLIENT_SECRET=your-app-secret
DROPBOX_REDIRECT_URI=http://localhost:3001/api/v1/integrations/dropbox/callback

# frontend/.env.local
NEXT_PUBLIC_DROPBOX_APP_KEY=your-app-key
```

Create an app in [Dropbox App Console](https://www.dropbox.com/developers/apps).
</details>

<details>
<summary><b>Telegram Bot</b></summary>

```bash
# backend/.env
TELEGRAM_BOT_TOKEN=your-token-from-botfather
```

Get a token from [@BotFather](https://t.me/botfather), then connect in **Settings → Telegram**.
</details>

<details>
<summary><b>Email (Resend)</b></summary>

Used for workspace invitation emails. If not configured, invitation links are returned in the API response but no email is sent.

```bash
# backend/.env
RESEND_API_KEY=re_your-api-key
RESEND_FROM="Lumio <noreply@your-domain.com>"
```

Get an API key at [resend.com](https://resend.com).
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
make quick-dev         # Zero-config startup: dev mode + seed demo user (recommended entry point)
make setup             # Copy env files and generate JWT secrets only
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

**Storybook**

```bash
make storybook         # Start Storybook dev server at http://localhost:6006
make storybook-build   # Build static Storybook to frontend/storybook-static/
make storybook-serve   # Serve Storybook from downloaded CI artifacts
make storybook-download # Download latest Storybook from GitHub Actions
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

Lumio uses TypeORM migrations exclusively (`synchronize: false`). Migrations run automatically on every startup unless `RUN_MIGRATIONS=false` is set. There are currently 64 migrations covering the entire schema history.

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
make dev
# equivalent to:
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Source file changes automatically reload both backend (ts-node watch) and frontend (Next.js HMR).

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

### Storybook

Storybook documents all UI components with interactive examples.

```bash
# Start development server
make storybook         # or: cd frontend && npm run storybook

# Build static output
make storybook-build   # output: frontend/storybook-static/

# Work with CI artifacts
make storybook-download   # Download latest build from GitHub Actions
make storybook-serve      # Serve the downloaded build locally
```

Stories live in `frontend/app/stories/` and follow the `*.stories.tsx` naming convention. Storybook is automatically built on every PR and push to `main` as a GitHub Actions artifact (7-day retention for PRs, 30-day for main).

**Story categories:** Components, Pages, Transactions, Modals, Tables, Charts, Mock Data.

---

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
│   (Port 3000)           │         │  - Google OAuth             │
│                         │         │  - Gmail API                │
│  - App Router           │         │  - Google Drive             │
│  - React 19             │         │  - Dropbox                  │
│  - TailwindCSS          │         │  - Telegram Bot             │
│  - Real-time updates    │         │  - OpenAI / Gemini          │
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
│  - 50 TypeORM entities│   │  - Session cache      │
│  - 64 migrations      │   │  - Rate limiting      │
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
- 50 TypeORM entities covering all domain objects (see `backend/src/entities/`)

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
      ├── GenericPdfParser   (AI-assisted: Gemini / OpenAI)
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
| [docs/plans/](docs/plans/) | 24 feature design and implementation plan documents |
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

[NestJS](https://nestjs.com/) · [Next.js](https://nextjs.org/) · [PostgreSQL](https://www.postgresql.org/) · [TypeORM](https://typeorm.io/) · [Redis](https://redis.io/) · [TailwindCSS](https://tailwindcss.com/) · [Mantine](https://mantine.dev/) · [MUI](https://mui.com/) · [HeroUI](https://www.heroui.com/) · [TanStack Table](https://tanstack.com/table) · [ECharts](https://echarts.apache.org/) · [Tesseract.js](https://tesseract.projectnaptha.com/) · [Socket.IO](https://socket.io/) · [Intlayer](https://intlayer.org/) · [driver.js](https://driverjs.com/) · [Biome](https://biomejs.dev/) · [Storybook](https://storybook.js.org/) · [Resend](https://resend.com/) · and many more.

---

<div align="center">

**[back to top](#lumio)**

Made with care by the Lumio community

</div>
