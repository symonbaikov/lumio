---
title: Testing
description: Unit, integration, and e2e test guidance
---

Lumio uses Jest for the backend and Vitest for the frontend. CI also runs e2e tests against a Postgres
service container.

## Backend tests (Jest)

```bash
cd backend
npm run test
npm run test:e2e
npm run test:cov
```

Tests live under:

- `backend/@tests/unit`
- `backend/@tests/e2e`

## Frontend tests (Vitest)

```bash
cd frontend
npm run test
```

## Storybook

```bash
cd frontend
npm run storybook
```

## Coverage goals

- Backend: 80%+
- Frontend: 70%+

Next: [Coding Standards](coding-standards)
