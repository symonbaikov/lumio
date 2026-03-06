# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lumio is an open-source financial data platform for importing, processing, and analyzing bank statements. The application is built as a full-stack TypeScript monorepo with a NestJS backend and Next.js 14 frontend.

**Tech Stack:**
- **Backend:** NestJS + TypeORM + PostgreSQL + Redis (BullMQ)
- **Frontend:** Next.js 14 (App Router) + React 19 + TailwindCSS 4 + Material-UI
- **Database:** PostgreSQL with TypeORM migrations
- **Cache/Queue:** Redis
- **i18n:** Intlayer (3 languages supported)
- **Linting:** Biome
- **Observability:** Prometheus + Grafana

## Commands Reference

### Development Workflow

```bash
# Start services (Docker)
make dev                    # Development mode with hot reload
make start                  # Production mode
make stop                   # Stop all services

# Local development (no Docker)
make db-start              # Start only PostgreSQL and Redis
cd backend && npm run start:dev
cd frontend && npm run dev

# Database
make migrate               # Run migrations in Docker
cd backend && npm run migration:run              # Local
cd backend && npm run migration:generate -- MigrationName  # Generate new migration
cd backend && npm run migration:revert           # Revert last migration

# Admin user
make admin email=admin@example.com password=admin123 name="Admin User"
cd backend && npm run create-admin -- email password "Name"  # Local

# Testing
make test                  # Run all tests
make test-backend          # Backend tests only
make test-e2e              # E2E tests
make test-cov              # With coverage
cd backend && npm run test:watch                 # Watch mode
cd backend && npm run test:golden                # Golden tests for parsing

# Code quality
make lint                  # Biome lint with autofix
make lint-check            # Check without fixing
make format                # Format all code
cd backend && npm run lint:check
cd frontend && npm run lint:check

# Build
make build                 # Build backend + frontend
cd backend && npm run build
cd frontend && npm run build

# Monitoring
make observability         # Start Prometheus + Grafana
make observability-stop

# Storybook
make storybook             # Start Storybook dev server (port 6006)
make storybook-build       # Build static Storybook
cd frontend && npm run storybook
cd frontend && npm run storybook:build

# Utilities
make logs                  # View all logs
make logs-backend          # Backend logs only
make health                # Check service health
make shell-backend         # Open shell in backend container

# Debugging & Scripts
cd backend && npm run parse:debug    # Debug parsing for specific file
cd backend && npm run parse:diff     # Compare parsing results
cd backend && npm run parse:tables   # Dump PDF table structure
cd backend && npm run storage:verify # Verify storage integrity
cd backend && npm run storage:repair # Repair storage issues
```

### Running Single Tests

```bash
# Backend
cd backend
npm run test:unit -- path/to/test.spec.ts           # Single test file
npm run test:unit -- --testNamePattern="test name"  # By test name
npm run test:e2e -- @tests/e2e/statements.e2e-spec.ts

# Frontend
cd frontend
npm test -- path/to/test.spec.tsx
```

## Architecture

### Backend Module Structure

The backend follows **NestJS modular architecture** with strict separation of concerns:

```
backend/src/
├── modules/              # Feature modules
│   ├── auth/            # JWT authentication (access + refresh tokens)
│   ├── users/           # User management
│   ├── workspaces/      # Multi-tenant workspaces with RBAC
│   ├── statements/      # Bank statement uploads
│   ├── parsing/         # Multi-format bank statement parsers
│   │   ├── parsers/     # Format-specific parsers (Kaspi, Bereke, CSV, Excel, PDF)
│   │   └── services/    # Normalization, validation, quality metrics
│   ├── transactions/    # Extracted financial transactions
│   ├── categories/      # Transaction categorization with ML learning
│   ├── classification/  # Auto-classification service
│   ├── custom-tables/   # User-defined data structures
│   ├── google-sheets/   # Google Sheets integration
│   ├── google-drive/    # Google Drive integration
│   ├── storage/         # File storage with versioning & folders
│   ├── reports/         # Financial reports generation
│   ├── telegram/        # Telegram bot integration
│   ├── data-entry/      # Manual data entry
│   ├── branches/        # Branch management
│   ├── wallets/         # Wallet management
│   └── observability/   # Prometheus metrics
├── entities/            # TypeORM entities (database models)
├── common/              # Shared utilities, guards, decorators
│   ├── guards/          # JwtAuthGuard, PermissionsGuard
│   ├── decorators/      # @Public(), @CurrentUser(), @RequirePermissions()
│   ├── filters/         # HTTP exception filters
│   ├── interceptors/    # Logging, metrics
│   └── utils/           # Parsers, normalizers, validators
├── config/              # Configuration (database, multer)
├── migrations/          # TypeORM migrations
└── main.ts              # Bootstrap (Swagger, CORS, validation pipe)
```

**Key architectural patterns:**
- **Global Guards:** JwtAuthGuard (default JWT protection), ThrottlerGuard (rate limiting)
- **Use @Public() decorator:** To bypass JWT auth on specific endpoints (e.g., `/auth/login`, `/auth/register`)
- **Global Validation Pipe:** All DTOs validated with class-validator
- **API Versioning:** All endpoints under `/api/v1` prefix
- **Idempotency:** file_hash in Statement entity prevents duplicate uploads
- **Observability:** Request correlation IDs, structured JSON logging, Prometheus metrics

### Database & Migrations

- **ORM:** TypeORM with automatic entity loading
- **Migrations:** Located in `backend/src/migrations/`
- **Auto-run:** Migrations run automatically on startup (unless `RUN_MIGRATIONS=false`)
- **Generating migrations:** After entity changes, run `npm run migration:generate -- MigrationName`
- **All schema changes must be done via migrations** - `synchronize: false` in production

**Important entities:**
- `User` - Users with workspace membership
- `Workspace` - Multi-tenant workspaces
- `WorkspaceMember` - User-workspace relationship with roles (owner, admin, member, viewer)
- `Statement` - Uploaded bank statements (has `file_hash` for idempotency)
- `Transaction` - Parsed financial transactions
- `Category` - Transaction categories
- `CategoryLearning` - ML-based category predictions
- `CustomTable` / `CustomTableRow` - User-defined data structures
- `Integration` / `IntegrationToken` - OAuth integrations (Google, etc.)

### Frontend Architecture

```
frontend/app/
├── (auth)/              # Route group - authentication pages (login, register)
├── admin/               # Admin dashboard (user management)
├── categories/          # Category management
├── custom-tables/       # Custom tables UI with TanStack Table
├── data-entry/          # Manual data entry forms
├── integrations/        # Integration settings (Google Sheets, Drive)
├── reports/             # Financial reports with ECharts
├── settings/            # User/workspace settings
├── statements/          # Statement upload & management
├── storage/             # File storage browser
├── components/          # Reusable React components
│   ├── ui/              # Base UI components
│   ├── Navigation.tsx   # Main navigation with workspace switcher
│   ├── PDFThumbnail.tsx # PDF preview component
│   ├── TransactionsView.tsx - Transaction grid
│   └── ...
├── hooks/               # Custom React hooks (useAuth, etc.)
├── tours/               # Driver.js guided tours (10 tours, 3 languages)
├── stories/             # Storybook stories
├── providers.tsx        # Global providers (Intlayer, MUI theme, toast)
└── globals.css          # Tailwind CSS + CSS variables
```

**Key patterns:**
- **App Router:** Next.js 14 file-based routing with route groups `(auth)`
- **Authentication:** JWT tokens stored in localStorage, managed by `useAuth()` hook
- **API calls:** Axios with interceptors for auth headers
- **State:** Primarily React Context (no Redux in current implementation)
- **i18n:** Intlayer for multi-language support (en, ru, kk)
- **UI:** Mix of TailwindCSS + MUI components + shadcn/ui primitives
- **Tours:** Driver.js for interactive onboarding tours (TourAutoStarter component)

### Parsing System

The parsing module is the core of Lumio's statement processing:

**Parser Factory Pattern:**
- `ParserFactoryService` automatically selects the correct parser based on:
  1. Bank name detection (from file content)
  2. File type (PDF, CSV, Excel)
  3. Format version (e.g., Bereke has "old" and "new" formats)

**Available Parsers:**
- `KaspiParser` - Kaspi Bank PDF statements
- `BerekeNewParser` - Bereke Bank (new format)
- `BerekeOldParser` - Bereke Bank (old format)
- `GenericPdfParser` - Generic PDF tables with AI extraction
- `ExcelParser` - Excel/XLSX files
- `CsvParser` - CSV files
- **Base class:** `BaseParser` - All parsers extend this

**Parser Implementation:**
1. Each parser implements `IParser` interface
2. Must implement `canParse()` method to detect compatibility
3. Must implement `parse()` method to extract transactions
4. Use helper services for normalization:
   - `UniversalDateParserService` - Multi-format date parsing
   - `UniversalAmountParserService` - Number normalization (handles commas, spaces)
   - `StatementNormalizationService` - Data quality checks
   - `TransactionNormalizerService` - Field normalization
   - `ChecksumValidationService` - Balance validation
   - `IntelligentDeduplicationService` - Duplicate detection

**Adding a new parser:**
1. Create `backend/src/modules/parsing/parsers/your-bank.parser.ts`
2. Extend `BaseParser` or implement `IParser`
3. Register in `ParserFactoryService` constructor
4. Add detection logic in `detectBankAndFormat()`
5. Add enum value to `BankName` in `statement.entity.ts`
6. Create golden tests in `backend/src/modules/parsing/__tests__/parsing.golden.spec.ts`

### Workspace & Permissions System

Lumio supports **multi-tenant workspaces** with role-based access control (RBAC):

**Workspace roles:**
- `owner` - Full control, can delete workspace
- `admin` - Manage members, settings
- `member` - Full access to data
- `viewer` - Read-only access

**Permission checks:**
- Use `@RequirePermissions()` decorator on controller methods
- `PermissionsGuard` validates workspace membership and role
- Current user available via `@CurrentUser()` decorator

**Workspace switching:**
- Frontend Navigation component has workspace switcher
- All API calls include workspace context via `workspaceId` parameter or header

## Code Style & Standards

### Architecture Rules

All architectural rules are documented in `docs/arch-rules.md`. Key rules:

**Mandatory:**
- TypeScript with strict mode
- RESTful API only (no GraphQL)
- All endpoints under `/api/v1` prefix
- PostgreSQL as primary database
- All schema changes via TypeORM migrations
- JWT authentication (HS256)
- Idempotent operations (use file_hash or Idempotency-Key)
- Structured JSON logging with correlation IDs
- Biome for linting and formatting
- All code comments in English

**Forbidden:**
- Direct database queries from frontend
- `any` types (minimize usage)
- Synchronous processing of large files (use BullMQ queues)
- GraphQL or RPC protocols
- NoSQL as primary database
- `synchronize: true` in TypeORM config

**Performance limits:**
- PDF parsing: max 30 seconds per file
- Max file size: 10MB
- Parallel processing: max 5 files
- Rate limiting: 100 req/hour (unauthenticated), 500 req/min (authenticated)

### Formatting & Linting

**Biome configuration (`biome.json`):**
- 2 spaces indentation
- Single quotes
- 100 char line width
- Semicolons always
- Trailing commas

**Running checks:**
```bash
make lint          # Auto-fix
make lint-check    # Check only
make format        # Format code
```

### Testing Standards

**Backend tests:**
- Unit tests: `backend/@tests/unit/modules/[module]/*.spec.ts`
- E2E tests: `backend/@tests/e2e/*.e2e-spec.ts`
- Golden tests: `backend/src/modules/parsing/__tests__/parsing.golden.spec.ts`
- Mock external services (Google APIs, AI APIs)
- Use `supertest` for E2E API testing

**Golden tests for parsing:**
- Located in `backend/src/modules/parsing/__tests__/`
- Store expected outputs in version control
- Run with `npm run test:golden`
- Enable with `GOLDEN_ENABLED=1` environment variable

## Environment Variables

### Backend Required Variables

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/lumio
JWT_SECRET=<generate with: openssl rand -base64 32>
JWT_REFRESH_SECRET=<generate with: openssl rand -base64 32>
REDIS_HOST=localhost  # or 'redis' in Docker
REDIS_PORT=6379
PORT=3001
NODE_ENV=development|production
```

### Frontend Required Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_ENV=development|production
```

### Optional Integration Variables

```bash
# Google OAuth & Sheets
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Google Drive
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=

# Telegram Bot
TELEGRAM_BOT_TOKEN=

# Email (Resend)
RESEND_API_KEY=
RESEND_FROM=

# AI (for GenericPdfParser)
OPENAI_API_KEY=
GOOGLE_GEMINI_API_KEY=
```

## Common Development Tasks

### Adding a New Backend Module

1. Create module structure: `backend/src/modules/your-module/`
2. Create entity in `backend/src/entities/your-entity.entity.ts`
3. Export entity from `backend/src/entities/index.ts`
4. Add entity to `TypeOrmModule.forFeature([])` in `app.module.ts`
5. Generate migration: `npm run migration:generate -- AddYourEntity`
6. Create module file: `your-module.module.ts`
7. Create controller: `your-module.controller.ts` (use DTOs for validation)
8. Create service: `your-module.service.ts` (business logic)
9. Register module in `app.module.ts` imports
10. Add Swagger decorators to controller

### Adding a New Frontend Page

1. Create route directory: `frontend/app/your-page/`
2. Create `page.tsx` (server component or client component with 'use client')
3. Create `page.content.ts` for i18n content (Intlayer)
4. Add navigation link in `frontend/app/components/Navigation.tsx`
5. Create API client functions in component or custom hook
6. Use `useAuth()` hook for authentication state

### Debugging Parsing Issues

```bash
# Debug specific file
npm run parse:debug /path/to/file.pdf

# Compare two parsing attempts
npm run parse:diff file1.pdf file2.pdf

# Dump PDF table structure
npm run parse:tables /path/to/file.pdf

# Check parsing quality metrics
# (logged automatically during parsing)
```

### Working with Storage

```bash
# Verify storage integrity
npm run storage:verify

# Repair storage issues (missing files, orphaned records)
npm run storage:repair
```

## Docker & Deployment

**Docker Compose files:**
- `docker-compose.yml` - Production configuration
- `docker-compose.dev.yml` - Development overrides (hot reload, volume mounts)
- `docker-compose.observability.yml` - Monitoring stack

**Services:**
- `lumio-backend` - NestJS API (port 3001)
- `lumio-frontend` - Next.js app (port 3000)
- `lumio-postgres` - PostgreSQL (port 5432)
- `lumio-redis` - Redis (port 6379)
- `prometheus` - Metrics (port 9090)
- `grafana` - Dashboards (port 3002)

**Volumes:**
- `postgres_data` - Database persistence
- `redis_data` - Redis persistence
- `uploads` - Uploaded files (statements, reports)

**Health checks:**
- Backend: `http://localhost:3001/api/v1/health`
- Frontend: `http://localhost:3000`
- Swagger: `http://localhost:3001/api/docs`

## Important Notes

- **Cursor rules:** Project follows rules defined in `.cursor/rules/main.mdc` which references `docs/arch-rules.md` and `docs/requirements.md`
- **Migrations:** Always run automatically on startup unless disabled
- **File uploads:** Stored in `backend/uploads/` directory (or S3-compatible storage)
- **Swagger docs:** Available at `/api/docs` with JWT bearer auth support
- **Multi-language:** UI supports English, Russian, Kazakh (managed via Intlayer)
- **Observability:** Request IDs, structured logs, Prometheus metrics enabled by default
- **Security:** All passwords hashed with bcrypt, JWT tokens, rate limiting enabled
