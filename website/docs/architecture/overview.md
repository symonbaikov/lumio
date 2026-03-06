---
title: Architecture Overview
description: Service topology and request flow
---

Lumio is a four-service stack: a Next.js frontend, a NestJS API, PostgreSQL, and Redis. It ships with optional
observability services (Prometheus + Grafana) and multiple integration workers.

![Lumio architecture diagram](/img/architecture.svg)

## Core services

1. **Frontend (Next.js)**
   - Web UI for uploads, dashboards, and configuration
   - Uses API proxying for local dev and API URL injection in Docker

2. **Backend (NestJS)**
   - REST API at `/api/v1`
   - Socket.IO for real-time updates
   - JWT authentication, RBAC, audit logging

3. **PostgreSQL**
   - TypeORM entities with migration-driven schema changes
   - Soft deletes and idempotency keys for safe imports

4. **Redis**
   - Queues, job scheduling, caching, and dedup heuristics

## Request flow

1. Client uploads a statement file.
2. Backend computes SHA-256 hash and checks for duplicates.
3. ParserFactory selects the parser (bank-specific or generic).
4. Transactions are extracted, normalized, and stored in an import session.
5. AI classifiers label categories when enabled.
6. Dedup logic merges repeats and marks conflicts.

## Observability

The backend exports Prometheus metrics and logs structured JSON events. Grafana dashboards are preconfigured in
`observability/` and can be started via `make observability`.

Next: [Backend Architecture](backend)
