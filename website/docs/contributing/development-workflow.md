---
title: Development Workflow
description: Branches, PRs, and CI expectations
---

Lumio uses Conventional Commits, comprehensive CI checks, and a detailed PR template to keep changes stable.

## Branching

- `main` is the production branch
- Feature work should use short-lived branches (e.g., `feat/parsing-bereke-pdf`)

## Commit messages

Conventional Commits are required:

```
feat(parsing): add Bereke bank PDF parser
fix(import): handle duplicate session retries
```

## Pull requests

The PR template requires:

- Change summary
- Test coverage
- Screenshots for UI changes
- Notes on migrations or breaking changes

## CI checks

CI includes linting, type checks, unit/e2e tests, dependency scans, and Docker builds. Any change touching
database migrations or auth requires special labels.

## Local workflow

```bash
make lint
make test
make build
```

Next: [Testing](testing)
