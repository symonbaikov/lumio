---
title: Configuration
description: Environment variables and integration setup
---

Lumio ships with sane defaults for local development. Production deployments require real secrets and stable
credentials.

## Root environment (.env)

These variables are read by Docker Compose in production-like setups.

```bash
# Required in production
JWT_SECRET=
JWT_REFRESH_SECRET=
DATABASE_URL=postgresql://user:password@host:5432/finflow

# Optional integrations
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GEMINI_API_KEY=
DROPBOX_CLIENT_ID=
DROPBOX_CLIENT_SECRET=
DROPBOX_REDIRECT_URI=
NEXT_PUBLIC_DROPBOX_APP_KEY=
TELEGRAM_BOT_TOKEN=
SHEETS_WEBHOOK_TOKEN=
SHEETS_WATCH_COLUMNS=
SHEETS_ALLOWED_SPREADSHEET_IDS=
SHEETS_ALLOWED_SHEETS=
RESEND_API_KEY=
RESEND_FROM=
```

## Backend environment (backend/.env)

The backend supports a full configuration reference in `backend/.env.all-options`. Common settings:

```bash
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://finflow:finflow@localhost:5432/finflow
REDIS_HOST=localhost

JWT_SECRET=
JWT_REFRESH_SECRET=
```

Integration variables include Gmail, Google Drive, Dropbox, Sheets, Telegram, and OpenRouter. See
`backend/.env.all-options` for the full list.

## Frontend environment

The frontend reads `NEXT_PUBLIC_API_URL` and OAuth client IDs from the environment. In Docker, these are injected
by the compose file. For local dev, the default proxy route handles API calls.

## Secrets management

- Never commit `.env` files or API keys.
- Use Docker secrets or a secret manager for production.
- Rotate OAuth client secrets and JWT keys regularly.

Next: [Demo Mode](demo-mode)
