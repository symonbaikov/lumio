---
title: Railway Deployment
description: Deploy Lumio on Railway
---

Lumio includes a Railway configuration (`railway.json`) and a deployment guide (`RAILWAY.md`).

## Quick overview

1. Create a new Railway project.
2. Connect the GitHub repository.
3. Set environment variables from `.env.example`.
4. Provision PostgreSQL and Redis services.
5. Deploy.

## Configuration

The Railway config handles build and start commands for the monorepo Docker image. Ensure that production
secrets are set before deploying.

## Observability

Railway can expose logs and metrics. Lumio also supports Prometheus/Grafana if you deploy those services
separately.

Next: [CI/CD Pipeline](ci-cd)
