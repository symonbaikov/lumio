---
title: API Overview
description: REST API structure and authentication
---

The Lumio API is served from the backend at `/api/v1`.

## Base URLs

- Local: `http://localhost:3001/api/v1`
- Swagger: `http://localhost:3001/api/docs`

## Authentication

- JWT access tokens (default 1 hour)
- Refresh tokens with rotation (default 30 days)
- Tokens are required for most routes

## Core API domains

- `/auth` - login, refresh, OAuth callbacks
- `/workspaces` - workspace management
- `/statements` - statement metadata
- `/transactions` - normalized ledger entries
- `/import` - import sessions
- `/parsing` - parser operations and debug tools
- `/reports` - reporting endpoints
- `/audit` - audit history
- `/integrations/*` - Gmail, Drive, Dropbox, Sheets, Telegram

## Error handling

Errors return structured JSON with a status code, message, and optional details. Use request IDs from logs for
traceability.

## Rate limiting

The API uses a throttler guard and can be tuned via configuration.

For full endpoint reference, use Swagger.
