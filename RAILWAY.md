# Railway Deployment Guide

## Overview

This guide explains how to deploy Lumio to Railway. The application consists of a NestJS backend and Next.js frontend served together from a single container.

## Architecture

```
Railway Project
├── Backend Service (Node.js/NestJS + Next.js Frontend)
│   ├── Dockerfile (builds frontend + backend)
│   ├── Runs API on /api/v1
│   ├── Serves frontend on /
│   └── Frontend listens on $PORT (default 3000) and proxies API to internal $API_PORT (default 4000)
├── PostgreSQL Service
│   └── Auto-provisioned database
└── Redis Service
    └── Auto-provisioned cache
```

## Prerequisites

- Railway account (https://railway.app)
- Project connected to GitHub
- PostgreSQL and Redis services configured in Railway

## Deployment Steps

### 1. Connect Your GitHub Repository

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize and select `parse-ledger` repository

### 2. Configure Services

Railway will automatically detect:
- **Backend**: Node.js application (uses root `Dockerfile`)
- **Database**: PostgreSQL (configure separately)
- **Cache**: Redis (configure separately)

### 3. Set Environment Variables

In Railway dashboard, add these variables to your backend service:

```
# JWT Secrets (REQUIRED - Generate new ones!)
# Generate with: openssl rand -base64 32
JWT_SECRET=<generate-with-openssl>
JWT_REFRESH_SECRET=<generate-with-openssl>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Database (Railway auto-generates, but verify these match)
DATABASE_URL=postgresql://${{Postgres.PGUSER}}:${{Postgres.PGPASSWORD}}@${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/lumio

# Redis
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}

# Application
NODE_ENV=production
PORT=3000                     # Frontend/entry port (Railway may override)
API_PORT=4000                 # Internal backend port (keep different from $PORT)
FRONTEND_URL=https://<your-frontend-domain>

# Optional - Google Sheets OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=https://<your-backend-domain>/api/v1/auth/google/callback

# Optional - Telegram Bot
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
```

**⚠️ IMPORTANT: JWT_SECRET and JWT_REFRESH_SECRET must be set!**

Generate strong secrets:
```bash
openssl rand -base64 32
```

Copy the output to JWT_SECRET and JWT_REFRESH_SECRET environment variables in Railway.


### 4. Add PostgreSQL Service

1. In Railway project, click "Add Service"
2. Select "PostgreSQL"
3. Set database name to `lumio`
4. Railway will auto-generate credentials

### 5. Add Redis Service

1. Click "Add Service"
2. Select "Redis"
3. No additional configuration needed

### 6. Configure Deployment

Railway will automatically use the `Dockerfile` at the root and `railway.json` for configuration.

Key settings:
- **Build Command**: Handled by Dockerfile (builds frontend and backend)
- **Start Command**: `./scripts/start.sh` (runs frontend and backend together)
- **Port**: `$PORT` for the frontend (defaults to 3000), backend runs internally on `$API_PORT` (defaults to 4000)
- **API Proxy**: `API_PROXY_TARGET` build arg/env should point to the backend host/port (defaults to `http://127.0.0.1:4000`)

The Dockerfile:
1. Builds the Next.js frontend with `output: "standalone"`
2. Builds the NestJS backend
3. Starts both processes: Next.js listens on `$PORT` and proxies `/api/*` to the backend on `$API_PORT`

### 7. Verify Deployment

After deployment, verify everything works:

- **Frontend**: `https://<your-railway-domain>/`
- **API**: `https://<your-railway-domain>/api/v1`
- **API Docs**: `https://<your-railway-domain>/api/docs`
- **Health Check**: `https://<your-railway-domain>/api/v1/health`

### 8. Database Migrations (Automatic)

Миграции применяются автоматически на старте контейнера (часть CD): при каждом деплое запускаются только новые миграции.

Проверка:
- открой Railway Logs и убедись, что есть строки `Running DB migrations...` и `DB migrations done`.

Ручной запуск (если нужно для отладки):

```bash
railway exec npm --prefix backend run migration:run
```

### 9. Create Admin User (Optional)

```bash
railway exec npm --prefix backend run create-admin
```

## Deployment Architecture

```
Railway Project (Single Service)
├── Backend Service (Node.js/NestJS + Next.js Frontend)
│   ├── Dockerfile (builds both frontend and backend)
│   ├── Serves Frontend on / (Next.js standalone)
│   ├── Serves API on /api/v1
│   ├── Swagger Docs on /api/docs
│   └── Frontend listens on $PORT (default 3000) and proxies API to internal $API_PORT (default 4000)
├── PostgreSQL Service
│   └── Auto-provisioned database (lumio)
└── Redis Service
    └── Auto-provisioned cache
```

## Frontend Integration

The frontend is built and served from the same container as the backend:

1. **Build Process**: The Dockerfile builds Next.js with `output: "standalone"` mode
2. **Serving**: The backend (main.ts) serves static files and fallback to frontend for client routes
3. **API Integration**: Frontend makes API calls to `/api/v1` (same origin)

## Monitoring & Logs

- View logs: Railway dashboard → Service → Logs
- Monitor CPU/Memory: Dashboard → Deployments
- Set up alerts for failures

## Troubleshooting

### Build fails with "cannot find module"

- Ensure `package-lock.json` exists in backend/
- Check Dockerfile is correctly building backend

### Database connection errors

- Verify `DATABASE_URL` environment variable is set
- Check PostgreSQL service is running
- Миграции запускаются автоматически; для ручного запуска см. раздел про миграции выше

### Port binding issues

- Ensure the frontend listens on `$PORT` (Railway provides it) and backend uses a different `$API_PORT` (default 4000)
- Check no other services are using same port

### Redis connection errors

- Verify Redis service is running
- Check `REDIS_HOST` and `REDIS_PORT` environment variables

## Production Checklist

- [ ] JWT secrets changed from defaults
- [ ] Database migrations run successfully
- [ ] CORS configured for frontend domain
- [ ] Environment variables set for all services
- [ ] SSL/TLS certificates enabled (Railway auto-enables)
- [ ] Monitoring and alerts configured
- [ ] Backup strategy for PostgreSQL data

## Rolling Back

If deployment fails:

1. Railway dashboard → Deployments
2. Select previous stable deployment
3. Click "Redeploy"

## Performance Tips

1. Use Railway's proximity features for lower latency
2. Enable database connection pooling
3. Configure Redis for caching
4. Monitor and optimize API response times

## Support

- Railway Documentation: https://docs.railway.app
- GitHub Issues: Report deployment issues
