# Getting Started

## Prerequisites

- Node.js 20+
- Docker with Compose (optional — only for the Docker modes)
- Free ports: `3000` (frontend), `3001` (backend)

## One command

```bash
git clone https://github.com/symonbaikov/lumio.git
cd lumio
npm run setup:dev
```

The interactive script asks which mode you want, then generates env files, starts PostgreSQL + Redis, runs migrations, seeds a demo user, and boots the app.

### Non-interactive modes

| Command | What it runs |
|---|---|
| `npm run setup:dev:docker` | Everything in Docker — recommended for a fresh clone |
| `npm run setup:dev:local` | Backend/frontend on the host, PostgreSQL/Redis in Docker |
| `npm run setup:dev:native` | Everything on the host — needs local PostgreSQL, Redis, `psql`, `redis-cli` |
| `npm run setup:env` | Only create/complete the ignored local env files |

`make quick-dev` is a compatibility alias for `setup:dev:docker`.

## Verify

```bash
curl -sS http://localhost:3001/api/v1/health/ready
```

Expected: `{"status":"ok","checks":{"db":"ok"}}`

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001/api/v1 |
| Swagger | http://localhost:3001/api/docs |
| Storybook | http://localhost:6006 (`make storybook`) |
| Grafana | http://localhost:3002 (`make observability`) |

Demo login: `demo@lumio.dev` / `demo123`. Create an admin with `make admin email=… password=… name="…"`.

## Environment

Dev env files are generated locally and git-ignored. Existing values are **preserved**; only missing defaults are appended.

- Backend overrides → `backend/.env`
- Frontend overrides → `frontend/.env.local`

Dev defaults worth knowing: PostgreSQL on port **5434** (not 5432), Redis on 6379, backend on 3001.

Required in production: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTEGRATIONS_ENCRYPTION_KEY`, `NEXT_PUBLIC_API_URL`. The backend refuses to boot without the first four when `NODE_ENV=production` (`backend/src/main.ts`).

```bash
openssl rand -base64 32   # generate a secret
bash scripts/generate-env.sh   # or set up all env files at once
```

Optional integrations (S3, WebDAV, IMAP, SMTP, Telegram, AI endpoint) are configured **in the UI**, not via env — env values are only bootstrap fallbacks. See [Integrations & Webhooks](Integrations-and-Webhooks).

## Daily loop

```bash
make dev            # hot-reload stack
make logs-backend   # tail one service
make migrate        # apply pending migrations
make lint           # Biome autofix
make test           # backend + frontend tests
```

Before pushing: `make lint` and `make test` must both pass. On the frontend, lint means **Biome and ESLint** — fixing one leaves CI red.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Docker daemon unavailable | Start Docker, rerun `npm run setup:dev` |
| `docker compose` not found | Install Compose v2 (the script falls back to `docker-compose`) |
| Port in use | Free 3000/3001, or change `POSTGRES_PORT` / `REDIS_PORT` in `.env` |
| Native mode stops early | Install the reported tool (`psql`, `redis-cli`) and rerun |
| Local Postgres on 5432 | Set `POSTGRES_PORT=5432` in `.env` **and** update `DATABASE_URL` in `backend/.env` |
| Corrupt local state | `make clean` then `npm run setup:dev` |
