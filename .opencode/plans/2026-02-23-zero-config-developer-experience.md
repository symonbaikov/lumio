# Zero-Config Developer Experience Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Lumio launchable with `git clone` + one command, no `.env` configuration needed for development. Both Docker (`make dev`) and local (`npm run dev`) modes must work identically.

**Architecture:** Add deterministic dev-fallback values for all required env vars (JWT secrets, DB URL, Redis) directly in backend code, guarded by `NODE_ENV !== 'production'`. Create a seed script that bootstraps a demo user with workspace. Update `.env.example` files to be minimal reference docs, not required for startup. Update README/CONTRIBUTING with streamlined Quick Start.

**Tech Stack:** NestJS ConfigService, TypeORM, bcrypt, Makefile, Docker Compose, bash scripts.

---

## Current State Analysis

### What blocks zero-config startup today

| Blocker | Where | Impact |
|---------|-------|--------|
| `JWT_SECRET` missing crashes app | `auth.module.ts:20`, `jwt.strategy.ts:37`, `auth.service.ts:378,481` | Hard crash at startup |
| `JWT_REFRESH_SECRET` missing crashes app | `jwt-refresh.strategy.ts:29`, `auth.service.ts:314,486` | Hard crash at startup |
| No demo user | N/A | Must manually register or `make admin` |
| `.env.example` files are confusing | Root has 26 lines of empty vars, backend has 97 lines | Intimidates contributors |
| README Quick Start has 8 steps | `README.md:172-203` | High friction for first run |

### What already works without config

| Component | Default | File |
|-----------|---------|------|
| `DATABASE_URL` | `postgresql://lumio:lumio@localhost:5432/lumio` | `database.config.ts:16` |
| `REDIS_URL` | `redis://localhost:6379` | `app.module.ts:101` |
| `PORT` | `3001` | `main.ts:93` |
| `FRONTEND_URL` | `http://localhost:3000` | `main.ts:62` |
| Google OAuth UI | Hidden when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` empty | `login/page.tsx:55,213`, `register/page.tsx:44,196` |
| Google/Dropbox/Gmail services | Graceful degradation | Various service files |
| Telegram | Logs warning, continues | `telegram.service.ts:55` |
| Resend email | Logs invite link instead | `workspaces.service.ts:869` |
| OpenRouter AI | Sets client=null, `isAvailable()` returns false | `openrouter.service.ts:18` |
| Gemini AI | `isAvailable()` returns false | Various AI helpers |
| `INTEGRATIONS_ENCRYPTION_KEY` | Falls back to `JWT_SECRET`, then `'lumio'` | `encryption.util.ts:7` |

---

## Task 1: Create dev-defaults utility

**Files:**
- Create: `backend/src/common/utils/dev-defaults.ts`

**Step 1: Create the utility file**

```typescript
// backend/src/common/utils/dev-defaults.ts
import { Logger } from '@nestjs/common';

const logger = new Logger('DevDefaults');

/**
 * Well-known deterministic dev secrets.
 * NEVER used in production — the code enforces real values there.
 * Deterministic (not random) so JWT tokens survive backend restarts during development.
 */
export const DEV_DEFAULTS = {
  JWT_SECRET: 'lumio-dev-jwt-secret-do-not-use-in-production-abc123',
  JWT_REFRESH_SECRET: 'lumio-dev-jwt-refresh-secret-do-not-use-in-production-xyz789',
} as const;

let warned = false;

/**
 * Returns the env value, or a dev-fallback in non-production.
 * Logs a single warning on first use of any fallback.
 */
export function devDefault(envValue: string | undefined, key: keyof typeof DEV_DEFAULTS): string {
  if (envValue) return envValue;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Missing required environment variable: ${key}. Dev defaults are disabled in production.`,
    );
  }

  if (!warned) {
    logger.warn(
      'Using built-in dev secrets for JWT. Do NOT use in production. ' +
        'Set JWT_SECRET and JWT_REFRESH_SECRET env vars to suppress this warning.',
    );
    warned = true;
  }

  return DEV_DEFAULTS[key];
}
```

**Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit src/common/utils/dev-defaults.ts`
Expected: no errors

**Step 3: Commit**

```bash
git add backend/src/common/utils/dev-defaults.ts
git commit -m "feat(config): add dev-defaults utility for zero-config development startup"
```

---

## Task 2: Wire dev-defaults into auth module and strategies

**Files:**
- Modify: `backend/src/modules/auth/auth.module.ts:19-21`
- Modify: `backend/src/modules/auth/strategies/jwt.strategy.ts:35-38`
- Modify: `backend/src/modules/auth/strategies/jwt-refresh.strategy.ts:28-30`
- Modify: `backend/src/modules/auth/auth.service.ts:314,378,481,486`

### Step 1: Update `auth.module.ts`

In `backend/src/modules/auth/auth.module.ts`, add import and change the JwtModule factory (lines 18-28):

```typescript
// Add import:
import { devDefault } from '../../common/utils/dev-defaults';

// Change JwtModule factory — replace the throw with devDefault:
useFactory: (configService: ConfigService): any => {
  const secret = devDefault(configService.get<string>('JWT_SECRET'), 'JWT_SECRET');
  return {
    secret,
    signOptions: {
      expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1h',
    },
  };
},
```

### Step 2: Update `jwt.strategy.ts`

In `backend/src/modules/auth/strategies/jwt.strategy.ts`, change lines 35-38:

```typescript
// Add import:
import { devDefault } from '../../../common/utils/dev-defaults';

// Replace lines 35-38:
const jwtSecret =
  configService.get<string>('JWT_ACCESS_SECRET') ||
  devDefault(configService.get<string>('JWT_SECRET'), 'JWT_SECRET');
// Remove the if (!jwtSecret) throw block
```

### Step 3: Update `jwt-refresh.strategy.ts`

In `backend/src/modules/auth/strategies/jwt-refresh.strategy.ts`, change lines 28-31:

```typescript
// Add import:
import { devDefault } from '../../../common/utils/dev-defaults';

// Replace lines 28-31:
const jwtRefreshSecret = devDefault(
  configService.get<string>('JWT_REFRESH_SECRET'),
  'JWT_REFRESH_SECRET',
);
// Remove the if (!jwtRefreshSecret) throw block
```

### Step 4: Update `auth.service.ts` — four `process.env` reads

In `backend/src/modules/auth/auth.service.ts`, add import and helper functions:

```typescript
import { DEV_DEFAULTS } from '../../common/utils/dev-defaults';

// Add helper functions at top of file, after imports:
const jwtSecret = () =>
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV !== 'production' ? DEV_DEFAULTS.JWT_SECRET : undefined);

const jwtRefreshSecret = () =>
  process.env.JWT_REFRESH_SECRET ||
  (process.env.NODE_ENV !== 'production' ? DEV_DEFAULTS.JWT_REFRESH_SECRET : undefined);
```

Then replace these four lines:

| Line | Before | After |
|------|--------|-------|
| 314 | `secret: process.env.JWT_REFRESH_SECRET,` | `secret: jwtRefreshSecret(),` |
| 378 | `secret: process.env.JWT_SECRET,` | `secret: jwtSecret(),` |
| 481 | `secret: process.env.JWT_SECRET,` | `secret: jwtSecret(),` |
| 486 | `secret: process.env.JWT_REFRESH_SECRET,` | `secret: jwtRefreshSecret(),` |

### Step 5: Note about `main.ts` — no changes needed

The `requireEnv()` check in `main.ts:20-24` is already guarded by `NODE_ENV === 'production'`. Dev mode skips this check, and `devDefault()` provides the values. No changes required.

### Step 6: Run tests to verify nothing breaks

Run: `cd backend && npm run test:unit`
Expected: All existing tests pass

### Step 7: Manual verification — start backend without .env

Run: `cd backend && mv .env .env.bak 2>/dev/null; npm run start:dev`
Expected: Backend starts successfully, logs "Using built-in dev secrets for JWT" warning.
Cleanup: `cd backend && mv .env.bak .env 2>/dev/null`

### Step 8: Commit

```bash
git add backend/src/modules/auth/
git commit -m "feat(auth): use dev-defaults for JWT secrets, eliminating .env requirement in development"
```

---

## Task 3: Create seed-demo script

**Files:**
- Create: `backend/scripts/seed-demo.ts`
- Modify: `backend/package.json` — add `"seed:demo"` script
- Modify: `Makefile` — add `seed-demo` target

### Step 1: Create `backend/scripts/seed-demo.ts`

The script bootstraps the full NestJS app so it uses `WorkspacesService.ensureUserWorkspace()` which creates workspace + seeds categories (23), tax rates (1), and balance accounts (13).

```typescript
// backend/scripts/seed-demo.ts
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

const DEMO_EMAIL = 'demo@lumio.dev';
const DEMO_PASSWORD = 'demo123';
const DEMO_NAME = 'Demo User';

async function seedDemo() {
  console.log('Seeding demo user...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);
    const userRepo = dataSource.getRepository('User');

    // Check if demo user already exists
    const existing = await userRepo.findOne({ where: { email: DEMO_EMAIL } });
    if (existing) {
      console.log(`Demo user already exists: ${DEMO_EMAIL}`);
      console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`);
      await app.close();
      return;
    }

    // Create the user
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const user = await userRepo.save(
      userRepo.create({
        email: DEMO_EMAIL,
        passwordHash,
        name: DEMO_NAME,
        role: 'user',
        isActive: true,
      }),
    );

    // Use WorkspacesService to create workspace with all defaults
    // (23 categories, 1 tax rate, 13 balance accounts)
    const { WorkspacesService } = await import('../src/modules/workspaces/workspaces.service');
    const workspacesService = app.get(WorkspacesService);
    await workspacesService.ensureUserWorkspace(user as any);

    console.log('Demo user created successfully!\n');
    console.log('  Email:    ' + DEMO_EMAIL);
    console.log('  Password: ' + DEMO_PASSWORD);
    console.log('');
  } catch (error) {
    console.error('Failed to seed demo user:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

seedDemo();
```

**NOTE for implementer:** The exact entity/service import paths may need adjustment. The key pattern is:
1. Bootstrap NestJS `ApplicationContext` (no HTTP server)
2. Get `DataSource` -> create user via repository
3. Get `WorkspacesService` -> call `ensureUserWorkspace(user)` for full workspace seeding
4. `ensureUserWorkspace` internally calls `createSystemCategories`, `createDefaultTaxRates`, and `seedDefaultAccounts`

If importing `WorkspacesService` directly is problematic, resolve it from the app container: `app.get(WorkspacesService)`.

### Step 2: Add npm script to `backend/package.json`

Add to `"scripts"`:

```json
"seed:demo": "ts-node -r tsconfig-paths/register scripts/seed-demo.ts"
```

### Step 3: Add Makefile targets

In `Makefile`, add after the `admin` target:

```makefile
## Create demo user (demo@lumio.dev / demo123) with workspace and default data
seed-demo:
	@echo "Creating demo user..."
	@$(DOCKER_EXEC_BACKEND) npm run seed:demo 2>/dev/null || (cd backend && npm run seed:demo)
```

This tries Docker first (if running), falls back to local execution.

### Step 4: Test the script

Run: `cd backend && npm run seed:demo`
Expected: Prints "Demo user created successfully!" with credentials, or "Demo user already exists" on re-run (idempotent).

### Step 5: Commit

```bash
git add backend/scripts/seed-demo.ts backend/package.json Makefile
git commit -m "feat(dev): add seed-demo script to create demo user with workspace and default data"
```

---

## Task 4: Simplify `.env.example` files

**Files:**
- Rewrite: `.env.example` (root)
- Rewrite: `backend/.env.example`
- Create: `backend/.env.all-options` (full reference, current `backend/.env.example` content preserved)
- Create: `frontend/.env.local.example`

### Step 1: Save current backend `.env.example` as reference

```bash
cp backend/.env.example backend/.env.all-options
```

Prepend a header:

```env
# Lumio Backend - Full Configuration Reference
# =================================================
# This file documents ALL available environment variables.
# You do NOT need all of these. See .env.example for the minimal set.
# Copy individual variables to your .env as needed.
#
```

### Step 2: Rewrite root `.env.example`

```env
# Lumio Environment Configuration
# ===================================
# For development: no configuration needed! The app works without this file.
# For production: copy to .env and set the required values below.

# --- Required for production only ---
# JWT_SECRET=<run: openssl rand -base64 32>
# JWT_REFRESH_SECRET=<run: openssl rand -base64 32>

# --- Optional integrations (uncomment to enable) ---
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=
# TELEGRAM_BOT_TOKEN=
# RESEND_API_KEY=
# RESEND_FROM=Lumio <noreply@your-domain.com>
# GEMINI_API_KEY=
```

### Step 3: Rewrite `backend/.env.example`

```env
# Lumio Backend Configuration
# ================================
# For development: no configuration needed! The app starts with sensible defaults.
# For production: copy to .env and configure required values.
#
# Full list of all available options: see .env.all-options

# --- Core (defaults shown, uncomment to override) ---
# PORT=3001
# NODE_ENV=development
# DATABASE_URL=postgresql://lumio:lumio@localhost:5432/lumio
# REDIS_URL=redis://localhost:6379

# --- Auth (auto-generated in development, required in production) ---
# JWT_SECRET=<run: openssl rand -base64 32>
# JWT_REFRESH_SECRET=<run: openssl rand -base64 32>
# JWT_EXPIRES_IN=1h
# JWT_REFRESH_EXPIRES_IN=30d

# --- Logging ---
# LOG_LEVEL=info
```

### Step 4: Create `frontend/.env.local.example`

```env
# Lumio Frontend Configuration
# =================================
# For development: no configuration needed!
# The frontend proxies API requests to http://127.0.0.1:3001 by default.

# --- Uncomment to override defaults ---
# NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
# NEXT_PUBLIC_ENV=development
```

### Step 5: Commit

```bash
git add .env.example backend/.env.example backend/.env.all-options frontend/.env.local.example
git commit -m "docs(env): simplify .env.example files, add .env.all-options as full reference"
```

---

## Task 5: Update docker-compose for zero-config dev

**Files:**
- Modify: `docker-compose.dev.yml`
- Modify: `docker-compose.yml`
- Modify: `Makefile`

### Step 1: Make `.env` file optional in `docker-compose.yml`

In `docker-compose.yml`, the backend service has `env_file: - .env`. Change to:

```yaml
# Before:
    env_file:
      - .env

# After:
    env_file:
      - path: .env
        required: false
```

**Note:** `required: false` needs Docker Compose v2.24+. As a safety net, the Makefile `dev` target also runs `touch .env`.

### Step 2: Add JWT dev defaults to `docker-compose.dev.yml`

In the backend service environment section, add:

```yaml
  backend:
    environment:
      NODE_ENV: development
      JWT_SECRET: lumio-dev-jwt-secret-do-not-use-in-production-abc123
      JWT_REFRESH_SECRET: lumio-dev-jwt-refresh-secret-do-not-use-in-production-xyz789
```

These match the deterministic values in `dev-defaults.ts`. Real `.env` values override if present.

### Step 3: Update Makefile `dev` target

```makefile
# Before:
dev:
	$(DOCKER_COMPOSE_DEV) up -d --build

# After:
dev:
	@touch .env
	$(DOCKER_COMPOSE_DEV) up -d --build
	@echo ""
	@echo "Lumio is running!"
	@echo "  Frontend:  http://localhost:3000"
	@echo "  Backend:   http://localhost:3001/api/v1"
	@echo "  API Docs:  http://localhost:3001/api/docs"
	@echo ""
	@echo "Run 'make seed-demo' to create a demo user (demo@lumio.dev / demo123)"
```

### Step 4: Add `make quick-dev` one-command target

```makefile
## Full zero-to-running: start services + seed demo user
quick-dev:
	@$(MAKE) dev
	@echo "Waiting for backend to be ready..."
	@for i in $$(seq 1 30); do \
		curl -sf http://localhost:3001/api/v1/health/ready > /dev/null 2>&1 && break || sleep 2; \
	done
	@$(MAKE) seed-demo
	@echo ""
	@echo "Lumio is ready! Login at http://localhost:3000"
	@echo "  Email:    demo@lumio.dev"
	@echo "  Password: demo123"
```

### Step 5: Commit

```bash
git add docker-compose.yml docker-compose.dev.yml Makefile
git commit -m "feat(docker): enable zero-config dev startup, add quick-dev target"
```

---

## Task 6: Update `generate-env.sh` and `quick-start.sh`

**Files:**
- Modify: `scripts/generate-env.sh`
- Modify: `scripts/quick-start.sh`

### Step 1: Simplify `generate-env.sh`

```bash
#!/bin/bash

echo "Lumio - Environment Setup"
echo ""
echo "NOTE: .env files are OPTIONAL for development."
echo "The app works without any configuration."
echo "This script generates .env files with custom JWT secrets."
echo ""

JWT_SECRET=$(openssl rand -base64 32 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 32 | tr -d '\n')

echo "Generated JWT secrets"

# Backend .env
if [ ! -f "backend/.env" ]; then
  echo "Creating backend/.env..."
  cat > backend/.env << EOF
# Generated by generate-env.sh - all values are optional in development
NODE_ENV=development
DATABASE_URL=postgresql://lumio:lumio@localhost:5432/lumio
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
EOF
  echo "Created backend/.env"
else
  echo "backend/.env already exists, skipping"
fi

# Frontend .env.local
if [ ! -f "frontend/.env.local" ]; then
  echo "Creating frontend/.env.local..."
  cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_ENV=development
EOF
  echo "Created frontend/.env.local"
else
  echo "frontend/.env.local already exists, skipping"
fi

echo ""
echo "Setup complete!"
echo ""
echo "Start development:"
echo "  Docker:  make dev"
echo "  Local:   make db-start && npm run dev"
echo ""
```

### Step 2: Update `quick-start.sh` — use seed-demo instead of interactive admin

Replace the admin user creation section (the interactive prompt) with:

```bash
echo "Creating demo user..."
docker exec lumio-backend npm run seed:demo || echo "Note: seed-demo failed, you can run it later with: make seed-demo"

echo ""
echo "Lumio is ready!"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:3001/api/v1"
echo "  Login:     demo@lumio.dev / demo123"
```

### Step 3: Commit

```bash
git add scripts/generate-env.sh scripts/quick-start.sh
git commit -m "refactor(scripts): simplify env generation, add seed-demo to quick-start"
```

---

## Task 7: Update README.md — streamlined Quick Start

**Files:**
- Modify: `README.md`

### Step 1: Rewrite the Quick Start section (lines 86-203)

Replace with:

~~~markdown
## Quick Start

### Prerequisites

- [Docker](https://www.docker.com/get-started) & Docker Compose
- [Node.js 18+](https://nodejs.org/) (only for local development without Docker)

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/symonbaikov/lumio.git
cd lumio
make quick-dev
```

That's it. Open http://localhost:3000 and login:
- **Email:** `demo@lumio.dev`
- **Password:** `demo123`

### Option 2: Local Development

```bash
git clone https://github.com/symonbaikov/lumio.git
cd lumio

# Start Postgres & Redis in Docker
make db-start

# Install dependencies
cd backend && npm install && cd ../frontend && npm install && cd ..

# Start both backend & frontend
npm run dev

# In a separate terminal — create demo user
make seed-demo
```

Open http://localhost:3000 and login with `demo@lumio.dev` / `demo123`.
Or register a new account through the UI.

> **No `.env` files needed.** The app auto-configures everything for development.
> For production or optional integrations (Google, Telegram, AI), see [Configuration](#configuration).
~~~

### Step 2: Simplify the Configuration section (lines 207-277)

Replace "Required Environment Variables" with:

~~~markdown
## Configuration

### Development

**No configuration needed.** The app starts with sensible defaults:

| Setting | Default |
|---------|---------|
| Database | `postgresql://lumio:lumio@localhost:5432/lumio` |
| Redis | `redis://localhost:6379` |
| JWT secrets | Auto-generated dev keys |
| Backend port | `3001` |
| Frontend port | `3000` |

To customize, create `backend/.env` — see `backend/.env.example` for options.
Full reference: `backend/.env.all-options`.

### Production

These environment variables are **required** in production (no defaults):

| Variable | Description | Generate |
|----------|-------------|----------|
| `JWT_SECRET` | Access token signing key | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Refresh token signing key | `openssl rand -base64 32` |
| `DATABASE_URL` | PostgreSQL connection string | — |
~~~

Keep the existing `<details>` blocks for Optional Integrations (Google, Telegram, Resend) as-is.

### Step 3: Update "User Management" section

Add demo user info:

~~~markdown
## User Management

### Demo User

For development, run `make seed-demo` to create:
- **Email:** `demo@lumio.dev`
- **Password:** `demo123`

### Create Admin User
(keep existing content)
~~~

### Step 4: Commit

```bash
git add README.md
git commit -m "docs(readme): streamline Quick Start to zero-config, two options in 3 commands each"
```

---

## Task 8: Update CONTRIBUTING.md

**Files:**
- Modify: `CONTRIBUTING.md`

### Step 1: Simplify the Development Setup section (lines 223-301)

Replace with:

~~~markdown
## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for database, or bring your own Postgres 14+ / Redis 7+)
- Git

### Getting Started

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/symonbaikov/lumio.git
   cd lumio
   ```

2. **Start with Docker (fastest):**
   ```bash
   make quick-dev
   ```
   Open http://localhost:3000 — login with `demo@lumio.dev` / `demo123`.

3. **Or start locally:**
   ```bash
   make db-start                     # Postgres + Redis in Docker
   cd backend && npm install          # Install backend deps
   cd ../frontend && npm install      # Install frontend deps
   cd ..
   npm run dev                        # Start both backend & frontend
   make seed-demo                     # Create demo user
   ```
   Open http://localhost:3000 — login with `demo@lumio.dev` / `demo123`.

> **No `.env` configuration needed.** Everything auto-configures for development.
> For integrations (Google OAuth, Telegram, etc.), see the README [Configuration section](README.md#configuration).

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api/v1 |
| API Docs (Swagger) | http://localhost:3001/api/docs |
| Storybook | http://localhost:6006 (run `make storybook`) |
~~~

### Step 2: Commit

```bash
git add CONTRIBUTING.md
git commit -m "docs(contributing): simplify Development Setup to zero-config workflow"
```

---

## Task 9: End-to-end verification

### Step 1: Clean slate test — Docker mode

```bash
# Remove all env files
rm -f .env backend/.env frontend/.env.local

# Start fresh
make quick-dev

# Verify:
# 1. Backend starts without errors (check: make logs-backend)
# 2. Frontend loads at http://localhost:3000
# 3. Login page shows NO Google button or "or" divider
# 4. Login as demo@lumio.dev / demo123 works
# 5. Workspace exists with categories visible in sidebar
```

### Step 2: Clean slate test — Local mode

```bash
# Stop Docker, remove env files
make stop
rm -f .env backend/.env frontend/.env.local

# Start database only
make db-start

# Install and run
cd backend && npm install && npm run start:dev &
cd ../frontend && npm install && npm run dev &
cd ..

# Wait for backend, then seed
sleep 15
make seed-demo

# Verify same 5 checks as Docker mode
```

### Step 3: Run test suites

```bash
make test          # All tests pass
make lint          # No lint errors
```

### Step 4: Final commit (if any fixups needed)

```bash
git add -A
git commit -m "test: verify zero-config developer experience end-to-end"
```

---

## Summary

| File | Action | Purpose |
|------|--------|---------|
| `backend/src/common/utils/dev-defaults.ts` | Create | Deterministic dev secrets + `devDefault()` helper |
| `backend/src/modules/auth/auth.module.ts` | Modify | Use `devDefault()` for JWT_SECRET |
| `backend/src/modules/auth/strategies/jwt.strategy.ts` | Modify | Use `devDefault()` for JWT_SECRET |
| `backend/src/modules/auth/strategies/jwt-refresh.strategy.ts` | Modify | Use `devDefault()` for JWT_REFRESH_SECRET |
| `backend/src/modules/auth/auth.service.ts` | Modify | Use `DEV_DEFAULTS` for 4 `process.env` reads |
| `backend/scripts/seed-demo.ts` | Create | Demo user + workspace + defaults seeder |
| `backend/package.json` | Modify | Add `seed:demo` script |
| `.env.example` | Rewrite | Minimal, all commented out |
| `backend/.env.example` | Rewrite | Minimal, all commented out |
| `backend/.env.all-options` | Create | Full reference (current `.env.example` preserved) |
| `frontend/.env.local.example` | Create | Minimal frontend reference |
| `docker-compose.yml` | Modify | Make `env_file` optional |
| `docker-compose.dev.yml` | Modify | Add JWT dev defaults to environment |
| `Makefile` | Modify | Add `seed-demo`, `quick-dev` targets; `touch .env` in `dev` |
| `scripts/generate-env.sh` | Modify | Simplify, note .env is optional |
| `scripts/quick-start.sh` | Modify | Use seed-demo instead of interactive admin |
| `README.md` | Modify | Streamline Quick Start to 3 commands per option |
| `CONTRIBUTING.md` | Modify | Simplify Development Setup section |

**Total: 18 files (5 new, 13 modified)**

**Result — developer experience after implementation:**

```
# Docker mode:
$ git clone https://github.com/symonbaikov/lumio.git && cd lumio
$ make quick-dev
  -> Lumio is ready! Login at http://localhost:3000
     Email: demo@lumio.dev / Password: demo123

# Local mode:
$ git clone https://github.com/symonbaikov/lumio.git && cd lumio
$ make db-start && npm install --prefix backend && npm install --prefix frontend
$ npm run dev
$ make seed-demo
  -> Open http://localhost:3000 — demo@lumio.dev / demo123
```
