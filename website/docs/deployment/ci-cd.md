---
title: CI/CD Pipeline
description: Continuous integration and deployment
---

Lumio ships with a robust CI/CD setup under `.github/workflows`.

## CI pipeline

Key jobs in `ci.yml`:

- Policy-as-code checks (OPA/Conftest)
- Linting with Biome
- TypeScript type checks
- Unit + e2e tests with PostgreSQL service
- Dependency and license scans
- Docker build + SBOM generation

## Sensitive change protection

The CI pipeline requires special labels for changes affecting:

- Database migrations
- Entities
- Authentication

## CD pipeline

`cd.yml` builds and publishes multi-arch images to GHCR, signs artifacts, generates SBOMs, and runs smoke tests.

## Release automation

- Release Please handles semantic versioning
- Changelog generation runs via `changelog.yml`

Next: [Makefile Reference](../reference/makefile)
