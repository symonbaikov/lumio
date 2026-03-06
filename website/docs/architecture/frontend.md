---
title: Frontend Architecture
description: Next.js routes, components, and state
---

The frontend is a Next.js 16 app with route groups and modular UI components.

## Route structure

- `(auth)` handles login and registration.
- `(main)` contains the authenticated product UI.
- `(onboarding)` manages guided setup flows.
- Standalone routes for `admin`, `audit`, `integrations`, `upload`, and `transactions`.

Key entry points live in `frontend/app`.

## Component system

- `frontend/app/components/ui` provides reusable UI primitives.
- Feature-specific components live under `components/dashboard`, `components/transactions`, and `components/side-panel`.
- Guided tours are defined in `frontend/app/tours` with per-feature content files.

## State and data

- API calls are handled through a shared data layer in `frontend/app/lib`.
- Auth state is managed with `useAuth` and a centralized provider.
- Real-time updates are received via Socket.IO client.

## Internationalization

Lumio uses Intlayer with English, Russian, and Kazakh translations. Content files for tours and UI labels are
stored next to the features they describe.

Next: [Database Architecture](database)
