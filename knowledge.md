# Project Knowledge

This file gives Codebuff context about your project: goals, commands, conventions, and gotchas.

## Overview

**FinFlow** is an open-source financial data platform for importing, processing, and analyzing bank statements. Full-stack TypeScript monorepo with NestJS backend and Next.js 14 frontend.

## Quickstart

```bash
# Setup (Docker - recommended)
make setup                 # Copy env files, generate JWT secrets
make dev                   # Start with hot reload
make admin email=admin@example.com password=admin123 name="Admin"

# Local development (no Docker)
make db-start              # Start PostgreSQL + Redis only
cd backend && npm install && npm run migration:run && npm run start:dev
cd frontend && npm install && npm run dev
```

## Commands

### Development
```bash
make dev                   # Docker dev mode (hot reload)
make start / make stop     # Production mode
make logs / make logs-backend
make health                # Check service health
```

### Testing
```bash
# Backend
cd backend
npm test                   # Unit tests
npm run test:watch         # Watch mode
npm run test:cov           # Coverage
npm run test:e2e           # E2E tests
npm run test:golden        # Parser golden tests (GOLDEN_ENABLED=1)

# Frontend
cd frontend && npm test
```

### Code Quality
```bash
make lint                  # Biome lint + autofix
make lint-check            # Check only
make format                # Format code
cd backend && npm run typecheck
cd frontend && npm run type-check
```

### Database
```bash
make migrate               # Run migrations (Docker)
cd backend && npm run migration:run              # Local
cd backend && npm run migration:generate -- Name # Generate new
cd backend && npm run migration:revert           # Revert last
```

### Debugging Scripts
```bash
cd backend
npm run parse:debug /path/to/file.pdf   # Debug parsing
npm run parse:tables /path/to/file.pdf  # Dump PDF tables
npm run storage:verify                   # Verify storage integrity
```

## Architecture

### Key Directories
```
backend/src/
├── modules/           # Feature modules (auth, statements, parsing, etc.)
├── entities/          # TypeORM entities
├── common/            # Guards, decorators, filters, utils
├── migrations/        # Database migrations
└── main.ts            # Bootstrap (Swagger, CORS, validation)

frontend/app/
├── (auth)/            # Auth pages (login, register)
├── components/        # Reusable React components
├── hooks/             # Custom hooks (useAuth)
├── tours/             # Driver.js guided tours
└── providers.tsx      # Global providers
```

### Tech Stack
- **Backend:** NestJS + TypeORM + PostgreSQL + Redis (BullMQ)
- **Frontend:** Next.js 14 (App Router) + React 19 + TailwindCSS 4 + MUI
- **Linting:** Biome (2 spaces, single quotes, semicolons)
- **i18n:** Intlayer (en, ru, kk)

### Data Flow
1. JWT auth (access: 1h, refresh: 30d) - global `JwtAuthGuard`
2. Use `@Public()` decorator for unauthenticated endpoints
3. All API endpoints under `/api/v1` prefix
4. Workspaces with RBAC (owner, admin, member, viewer)

## Conventions

### Formatting/Linting (Biome)
- 2 spaces indentation
- Single quotes
- Semicolons always
- 100 char line width
- Trailing commas

### Patterns to Follow
- Controllers thin, logic in Services
- DTOs with class-validator for all inputs
- TypeORM migrations for all schema changes (never `synchronize: true`)
- `file_hash` (SHA-256) for idempotent file uploads
- Structured JSON logging with correlation IDs
- All comments in English

### Things to Avoid
- `any` types (minimize usage)
- GraphQL (REST only)
- Direct DB queries from frontend
- Synchronous processing of large files (use BullMQ)
- Storing secrets outside `.env` files

## Gotchas

- **Migrations auto-run** on startup unless `RUN_MIGRATIONS=false`
- **Global guards:** JwtAuthGuard + ThrottlerGuard are applied globally
- **Parser factory:** Auto-selects parser based on bank detection + file type
- **Rate limits:** 100 req/hour (unauth), 500 req/min (auth)
- **Max file size:** 10MB, PDF parsing timeout: 30s
- **Swagger docs:** Available at `/api/docs` when backend running
- **Frontend auth:** JWT tokens in localStorage, managed by `useAuth()` hook

## Environment Variables

### Backend (required)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/finflow
JWT_SECRET=<openssl rand -base64 32>
JWT_REFRESH_SECRET=<openssl rand -base64 32>
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Frontend (required)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## URLs (local dev)
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/v1
- Swagger: http://localhost:3001/api/docs
- Storybook: http://localhost:6006 (`make storybook`)
