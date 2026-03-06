---
title: Quick Start
description: Run Lumio locally with Docker in minutes
---

This guide gets you from zero to a running Lumio stack using Docker Compose.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose)
- Make

## Start the stack

```bash
make quick-dev
```

This command:

- Builds the backend and frontend containers
- Starts Postgres + Redis
- Waits for the API to be healthy
- Seeds a demo workspace and user

## Log in

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/v1
- Demo credentials: `demo@lumio.dev` / `demo123`

## Next steps

- Upload a statement from the Upload page
- Explore the dashboard, reports, and audit log
- Review the configuration guide for integrations

Next: [Local Development](local-development)
