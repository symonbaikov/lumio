---
title: Docker Deployment
description: Production deployment with Docker Compose
---

Lumio ships a production Docker Compose setup in the repository root. CD publishes signed backend and frontend
images to GHCR for every release tag.

## Configuration

Generate a root `.env` with fresh secrets:

```bash
npm run setup:env   # or: make setup
```

The generated file targets development, so review it before production. Compose refuses to start without:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `INTEGRATIONS_ENCRYPTION_KEY`

Compose builds `DATABASE_URL` from the `POSTGRES_*` values. For a public deployment also set:

- `FRONTEND_URL` (defaults to `http://localhost:3000`) or `CORS_ORIGINS` to the public frontend origin — the
  backend refuses to start in production without an allowed origin
- `AUTH_COOKIE_SAMESITE=none` (HTTPS only) when the frontend and API sit on different registrable domains, and
  `AUTH_COOKIE_DOMAIN` to share cookies across subdomains
- `METRICS_AUTH_TOKEN` if you scrape `/api/v1/metrics`

## Start services

Run the published images:

```bash
docker compose pull
docker compose up -d
```

Pin a release with `LUMIO_IMAGE_TAG` in `.env`. `make start` builds the images locally instead
(`docker compose up -d --build`).

This starts:

- PostgreSQL 14
- Redis 7
- NestJS backend
- Next.js frontend

Migrations run automatically when the backend starts (`RUN_MIGRATIONS=true`). PostgreSQL and Redis publish their
ports on `127.0.0.1` only.

## Optional: receipt maps

```bash
docker compose --profile maps --profile geocoder up -d
```

Then set `TILESERVER_URL=http://tileserver:8080` and `GEOCODER_URL=http://nominatim:8080` for the backend and
restart it. `MAP_PBF_URL` selects the OpenStreetMap extract. See [Receipt Maps](../guides/receipt-maps).

## Reverse proxy

Terminate HTTPS in front of the stack and forward `X-Forwarded-For` and `X-Forwarded-Proto`. The backend trusts one
proxy hop, so rate limits key on the real client IP.

## Health checks

```bash
curl http://localhost:3001/api/v1/health         # liveness
curl http://localhost:3001/api/v1/health/ready   # also checks the database
```

The production backend and frontend images define Docker `HEALTHCHECK`s.

## Storage

Data lives in named volumes: `postgres_data`, `redis_data`, and `backend_uploads` (mounted at `/app/uploads`),
plus `map_data` and `nominatim_data` when the map profiles run. Back them up or map them to persistent storage.

## Logs

```bash
make logs
make logs-backend
```

Next: [CI/CD](ci-cd)
