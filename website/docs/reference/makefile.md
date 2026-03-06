---
title: Makefile Commands
description: Full reference of developer commands
---

Lumio ships with a comprehensive Makefile for common workflows.

## Core

- `make start` - Start production-like Docker services
- `make dev` - Start dev containers with hot reload
- `make stop` - Stop all Docker services
- `make restart` - Restart services
- `make clean` - Remove containers, volumes, and build artifacts

## Quick start

- `make quick-dev` - Zero-config dev startup + demo seed
- `make quick-start` - Alias for `quick-dev`

## Development

- `make backend-dev` - Run backend locally
- `make frontend-dev` - Run frontend locally
- `make db-start` - Start only Postgres + Redis

## Database

- `make migrate` - Run migrations
- `make migrate-generate name=X` - Generate migration
- `make migrate-revert` - Revert last migration
- `make db-shell` - Open psql shell

## Testing and quality

- `make lint` - Biome lint
- `make format` - Biome format
- `make type-check` - TypeScript checks
- `make test` - All tests
- `make test-e2e` - End-to-end tests

## Observability

- `make observability` - Start Prometheus + Grafana
- `make observability-stop` - Stop observability stack

## Docs and Storybook

- `make docs` - Open Swagger docs
- `make storybook` - Start Storybook

For full details, inspect `Makefile` in the repository root.
