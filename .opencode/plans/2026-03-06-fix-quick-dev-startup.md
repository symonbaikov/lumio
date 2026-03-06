# Fix `make quick-dev` Startup Failures

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three cascading failures in `make quick-dev`: backend `nest: not found`, frontend `@intlayer` node:fs chunking error, and seed-demo OOM kill (Error 137) — so the entire stack starts reliably with a single command.

**Architecture:** Split the backend Dockerfile builder stage so dev containers keep devDependencies; add `serverExternalPackages` to Next.js config for intlayer; pre-compile seed scripts into `dist/` so they run via `node` instead of `ts-node` (eliminating OOM from double AppModule bootstrap + TypeScript compilation overhead).

**Tech Stack:** Docker, docker-compose, NestJS, Next.js 16, TypeScript

---

## Root Cause Analysis

### Error 1: `sh: nest: not found`
- `backend/Dockerfile:21` runs `npm prune --omit=dev` in the `builder` stage
- `docker-compose.dev.yml:9` targets `builder` and runs `npm run start:dev` → `nest start --watch`
- But `@nestjs/cli` is a devDependency and was already pruned

### Error 2: `@intlayer` node:fs chunking error
- `intlayer`/`next-intlayer` v7.5.11 use `node:fs` internally
- `frontend/next.config.js` lacks `serverExternalPackages` — Next.js tries to bundle these into client chunks
- Webpack fails: "the chunking context (unknown) does not support external modules (request: node:fs)"

### Error 3: `seed-demo` Error 137 (OOM Kill)
- `seed:demo` script uses `ts-node` (devDependency — removed by prune) to bootstrap full `AppModule`
- Running via `docker exec` in the already-running backend container doubles memory usage
- Signal 9 (137 - 128) = OOM killer

---

### Task 1: Fix Backend Dockerfile — Add Dev Stage

**Files:**
- Modify: `backend/Dockerfile`

**Problem:** The `builder` stage does `npm prune --omit=dev`, removing `@nestjs/cli` and `ts-node`. But `docker-compose.dev.yml` targets `builder` to get a dev image with source code. The dev container needs devDependencies.

**Step 1: Restructure Dockerfile stages**

Replace the current Dockerfile content with a three-stage build:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.scripts.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application (compiles src/ to dist/ and scripts/ to dist/scripts/)
RUN npm run build && npm run build:scripts

# --- Dev stage (used by docker-compose.dev.yml) ---
# Keeps ALL dependencies including devDependencies
FROM builder AS dev

# No pruning here — devDependencies stay for nest start --watch, ts-node, etc.
CMD ["npm", "run", "start:dev"]

# --- Production stage ---
FROM node:20-alpine

WORKDIR /app

# Install Python + pdfplumber for PDF parsing + pdf2image for thumbnails
ENV PIP_BREAK_SYSTEM_PACKAGES=1
RUN apk add --no-cache python3 py3-pip py3-pillow poppler-utils && \
  pip3 install --no-cache-dir --break-system-packages pdfplumber==0.11.4 pdf2image==1.17.0

# Runtime dependencies from builder (pruned)
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

# Prune devDependencies for production
RUN npm prune --omit=dev

# Create uploads directory and reports subdirectory
RUN addgroup -S app && adduser -S app -G app && \
  mkdir -p uploads/reports && \
  chown -R app:app /app

USER app

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main.js"]
```

Key changes:
1. Moved `npm prune --omit=dev` from `builder` to the production stage
2. Added a `dev` stage (`FROM builder AS dev`) that keeps all devDependencies
3. Added `COPY tsconfig.scripts.json ./` and `RUN npm run build:scripts` (see Task 3)

**Step 2: Verify the build locally**

Run: `docker build --target dev -t lumio-backend:dev ./backend`
Expected: Build succeeds, `nest` CLI available in image.

Run: `docker build -t lumio-backend:prod ./backend`
Expected: Build succeeds, production image without devDependencies.

---

### Task 2: Update docker-compose.dev.yml — Target `dev` Stage

**Files:**
- Modify: `docker-compose.dev.yml`

**Step 1: Change backend target from `builder` to `dev`**

On line 9, change:
```yaml
      target: builder
```
to:
```yaml
      target: dev
```

The rest of the backend section stays the same.

**Step 2: Verify**

Run: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml build backend`
Expected: Build completes.

Run: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml run --rm backend npx nest --version`
Expected: NestJS CLI version prints successfully.

---

### Task 3: Pre-Compile Seed Scripts (Fix OOM)

**Files:**
- Create: `backend/tsconfig.scripts.json`
- Modify: `backend/package.json` (add `build:scripts`, update `seed:demo`)
- Modify: `Makefile` (update `seed-demo` target)

**Problem:** `seed:demo` uses `ts-node` which compiles TypeScript on-the-fly + bootstraps full `AppModule` — doubling memory inside the already-running container and causing OOM.

**Step 1: Create `backend/tsconfig.scripts.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": "./"
  },
  "include": ["scripts/**/*", "src/**/*"]
}
```

This extends the base tsconfig but includes `scripts/` directory alongside `src/`. Scripts like `scripts/seed-demo.ts` that import `../src/app.module` will compile correctly because both directories are included. Output will be `dist/scripts/seed-demo.js` and `dist/src/app.module.js`.

**Step 2: Add `build:scripts` npm script**

In `backend/package.json` scripts, add:
```json
"build:scripts": "tsc -p tsconfig.scripts.json --outDir dist"
```

**Step 3: Update `seed:demo` script**

In `backend/package.json`, change:
```json
"seed:demo": "node dist/scripts/seed-demo.js"
```

Keep ts-node version for local dev convenience:
```json
"seed:demo:dev": "ts-node -r tsconfig-paths/register scripts/seed-demo.ts"
```

**Step 4: Update Makefile `seed-demo` target**

In root `Makefile`, update lines 162-169:
```makefile
seed-demo: ## Create demo user (demo@lumio.dev / demo123)
	@echo "👤 Creating demo user..."
	@if docker inspect -f '{{.State.Running}}' finflow-backend >/dev/null 2>&1; then \
		docker exec finflow-backend node dist/scripts/seed-demo.js; \
	else \
		cd backend && npm run seed:demo; \
	fi
	@echo "✅ Demo user is ready!"
```

**Step 5: Verify compilation**

Run: `cd backend && npm run build && npm run build:scripts`
Expected: `dist/scripts/seed-demo.js` exists.

Run: `ls backend/dist/scripts/seed-demo.js`
Expected: File exists.

**Step 6: Commit**

```bash
git add backend/tsconfig.scripts.json backend/package.json Makefile
git commit -m "fix(seed): pre-compile seed scripts to avoid ts-node OOM"
```

---

### Task 4: Fix Frontend @intlayer node:fs Error

**Files:**
- Modify: `frontend/next.config.js`

**Problem:** `intlayer` and related packages import `node:fs` which cannot be bundled into browser chunks. Next.js needs to know to externalize these packages on the server side and provide empty fallbacks on the client side.

**Step 1: Add `serverExternalPackages` and webpack fallback**

Replace `frontend/next.config.js` content with:

```js
const normalizeTarget = url => String(url || '').replace(/\/$/, '');

// Used to proxy API requests through the Next server to the backend when running as a single service
const apiProxyTarget = normalizeTarget(process.env.API_PROXY_TARGET || 'http://127.0.0.1:3001');

const { withIntlayerSync } = require('next-intlayer/server');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: __dirname,

  serverExternalPackages: [
    'intlayer',
    'next-intlayer',
    '@intlayer/core',
    '@intlayer/dictionaries-entry',
    'react-intlayer',
  ],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiProxyTarget}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiProxyTarget}/uploads/:path*`,
      },
    ];
  },
};

module.exports = withIntlayerSync(nextConfig);
```

Key additions:
1. `serverExternalPackages` — tells Next.js NOT to bundle these packages into client/SSR chunks
2. `webpack` config with `fs: false, path: false` fallback for client-side

**Step 2: Verify frontend build**

Run: `cd frontend && npm run build`
Expected: Build succeeds without "chunking context does not support external modules" errors.

**Step 3: Commit**

```bash
git add frontend/next.config.js
git commit -m "fix(frontend): add serverExternalPackages for intlayer node:fs compat"
```

---

### Task 5: Clean Docker State and End-to-End Verification

**Files:** None (commands only)

**Step 1: Clean stale Docker volumes and images**

The anonymous `/app/node_modules` volume from previous dev runs still contains the pruned node_modules. Must be cleaned.

Run:
```bash
make clean
docker rmi lumio-backend lumio-frontend 2>/dev/null || true
```

**Step 2: Run `make quick-dev`**

Run: `make quick-dev`

Expected:
1. Backend container starts with `nest start --watch` — **no** `nest: not found`
2. Frontend container starts without `@intlayer` node:fs errors
3. `seed-demo` runs `node dist/scripts/seed-demo.js` successfully — **no** Error 137
4. Output shows: demo user created at `demo@lumio.dev / demo123`

**Step 3: Verify services are healthy**

Run: `make health`
Expected: Both backend and frontend respond.

Run: `curl -s http://localhost:3001/api/v1/health`
Expected: 200 OK response.

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
Expected: 200.

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix(docker): fix quick-dev startup — nest not found, intlayer node:fs, seed OOM"
```

---

## Summary of Changes

| File | Change | Fixes |
|------|--------|-------|
| `backend/Dockerfile` | Add `dev` stage between `builder` and production; move `npm prune` to production stage | `nest: not found` |
| `docker-compose.dev.yml` | Change `target: builder` → `target: dev` | `nest: not found` |
| `backend/tsconfig.scripts.json` | New file — extends tsconfig, includes `scripts/` | seed OOM |
| `backend/package.json` | Add `build:scripts`, change `seed:demo` to use compiled JS | seed OOM |
| `frontend/next.config.js` | Add `serverExternalPackages` + webpack `fs: false` fallback | `node:fs` chunking error |
| `Makefile` | Update `seed-demo` to use `node dist/scripts/seed-demo.js` | seed OOM |
