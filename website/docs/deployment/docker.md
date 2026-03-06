---
title: Docker Deployment
description: Production deployment with Docker Compose
---

Lumio ships with a production-ready Docker Compose setup in the repository root.

## Configuration

Copy the root `.env.example` and fill in production secrets:

```bash
cp .env.example .env
```

Set at minimum:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DATABASE_URL`

## Start services

```bash
make start
```

This starts:

- PostgreSQL 14
- Redis 7
- NestJS backend
- Next.js frontend

## Health checks

```bash
curl http://localhost:3001/api/v1/health/ready
```

## Storage

Uploads are stored in `backend_uploads` volume. For production, map this to persistent storage or an object
store integration.

## Logs

```bash
make logs
make logs-backend
```

Next: [Railway Deployment](railway)
