# Operations & Observability

## Deploy targets

**Docker Compose** — four services: `postgres` (14-alpine), `redis` (7-alpine), `backend`, `frontend`. Volumes: `postgres_data`, `redis_data`, `backend_uploads`.

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f
docker compose down
```

| File | Purpose |
|---|---|
| `docker-compose.yml` | Production |
| `docker-compose.dev.yml` | Dev overrides — source mounts, hot reload |
| `docker-compose.observability.yml` | Prometheus + Grafana |

**Railway** — connect the repo, set env vars, deploys on push to `main` with migrations applied automatically. Step-by-step in `RAILWAY.md`.

## Required production env

`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTEGRATIONS_ENCRYPTION_KEY` — the backend **refuses to boot** without them when `NODE_ENV=production`. Plus `NEXT_PUBLIC_API_URL` for the browser.

`INTEGRATIONS_ENCRYPTION_KEY` decrypts stored integration secrets: losing it or rotating it carelessly makes every saved integration credential unreadable. Back it up with the same care as the database.

Migrations run on startup unless `RUN_MIGRATIONS=false`.

## Health

| Endpoint | Use |
|---|---|
| `GET /api/v1/health` | Liveness |
| `GET /api/v1/health/ready` | Readiness — includes the DB check |
| `GET /api/v1/metrics` | Prometheus scrape target |

`health/ready` returns `{"status":"ok","checks":{"db":"ok"}}`. Point the orchestrator's readiness probe at it, not at `/health` — a live process with a dead database should not receive traffic.

## Metrics

```bash
make observability        # Prometheus :9090 + Grafana :3002 (admin/admin)
make observability-stop
```

Config in `observability/`: `prometheus.yml` scrapes `/api/v1/metrics` every 15 s; `grafana/` holds the datasource and dashboard JSON.

`HttpMetricsInterceptor` emits HTTP metrics for every request. Worth alerting on: 5xx rate above 1%, p99 latency, DB pool saturation, event-loop lag, heap size. Business-level signals worth tracking: statement processing time, import success rate, signup completion.

## Logging & tracing

Structured JSON via `AppLogger`. `requestContextMiddleware` mints a request id and trace id per request, held in AsyncLocalStorage and stamped on every log line, every error response body, and the `x-request-id` / `x-trace-id` response headers.

Debugging a user report: take the `requestId` from their error payload and grep the logs — it ties the failure to the exact request across services.

**Never log** passwords, tokens, API keys, integration credentials, or full PII. `HttpExceptionFilter` logs unhandled exceptions with URL and method, not bodies — keep it that way.

Levels: `error`, `warn`, `info`, `debug`. `error` means someone should look; anything routine is `info`.

## Backups

```bash
make db-backup                    # dump to .sql
make db-restore file=backup.sql
```

Back up before any data-modifying migration. `backend_uploads` holds statement files — a database-only backup restores the rows and loses the source documents.

## Maintenance scripts

```bash
npm --prefix backend run storage:verify          # find orphaned files
npm --prefix backend run storage:repair          # remove them
npm --prefix backend run cleanup:gmail-receipts  # prune old receipt jobs
```

Run `storage:verify` before `storage:repair` and read the output — repair deletes.

## CI/CD

GitHub Actions: CI (lint, typecheck, test), CD, CodeQL, dependency-review, OpenSSF Scorecard, release-please, Storybook build. Pipeline docs in `docs/CI/`; CVE allowlists and license exceptions in `docs/security/`.

Release notes come from Conventional Commits via release-please — a sloppy commit subject becomes a sloppy public changelog entry.

## Security posture

Full policy in `SECURITY.md`. Report vulnerabilities through GitHub Security Advisories, never a public issue.

Known gap, tracked openly: frontend tokens live in `localStorage` rather than `HttpOnly` cookies (see [Frontend Guide](Frontend-Guide)).
