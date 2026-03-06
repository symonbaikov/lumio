---
title: Introduction
description: What Lumio is and who it helps
---

Lumio is an open-source financial data platform for importing, processing, and analyzing bank statements. It
combines a NestJS API, a Next.js web app, and a structured parsing pipeline so teams can turn messy exports into
reliable, queryable financial data.

## What you can do with Lumio

- Import statements from PDFs, CSV/XLSX exports, OCR scans, and Gmail receipts.
- Normalize, deduplicate, and classify transactions with AI-assisted categorization.
- Manage multi-tenant workspaces with RBAC and full audit history.
- Automate reports and dashboards for finance and operations teams.

## Who Lumio is for

- Developers evaluating a production-ready financial data pipeline
- Contributors building new parsers and integrations
- Teams self-hosting a reliable statement import stack

## Quick facts

- Backend: NestJS 11 with TypeORM and PostgreSQL
- Frontend: Next.js 16 with React 19
- Data services: PostgreSQL 14 + Redis 7
- Integrations: Gmail, Google Drive, Dropbox, Sheets, Telegram
- Observability: Prometheus + Grafana

## Where to start

1. Follow the Quick Start guide for a Docker-based setup.
2. Log in with the demo account to explore the UI.
3. Review the parsing pipeline to understand how statements are processed.

Next: [Quick Start](getting-started/quick-start)
