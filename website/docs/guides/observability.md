---
title: Observability
description: Metrics, dashboards, and health checks
---

Lumio includes a ready-to-run observability stack with Prometheus and Grafana.

## Start the stack

```bash
make observability
```

Services are exposed at:

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002 (admin / lumio)

## Metrics

The backend exposes Prometheus metrics for:

- Request latency and error rates
- Import pipeline timing
- Queue processing
- Job failures

## Logs

Structured JSON logs include request IDs, workspace IDs, and parser context. Use them for correlation during
incident response.

## Health checks

- `GET /api/v1/health/ready` is used for readiness
- `GET /api/v1/health/live` is used for liveness

Next: [Architecture Overview](../architecture/overview)
