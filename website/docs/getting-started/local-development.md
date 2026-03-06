---
title: Local Development
description: Run backend and frontend without Docker
---

Use this workflow when you want faster iteration on the backend or frontend without Docker.

## Prerequisites

- Node.js 18+
- PostgreSQL 14
- Redis 7

## 1. Start dependencies

You can use Docker for services only:

```bash
make db-start
```

This starts Postgres + Redis using Docker Compose.

## 2. Configure the backend

Copy the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Update `backend/.env` if needed (database URL, JWT secrets).

## 3. Start backend API

```bash
cd backend
npm install
npm run start:dev
```

The API runs at `http://localhost:3001/api/v1`.

## 4. Start frontend

```bash
cd frontend
npm install
npm run dev
```

The web app runs at `http://localhost:3000`.

## Optional: seed demo data

```bash
make seed-demo
```

Next: [Configuration](configuration)
