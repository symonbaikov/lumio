# Frontend Guide

Next.js 16 App Router, React 19, TypeScript strict, MUI v7 + Emotion. Lives in `frontend/`.

## Layout

```
frontend/app/
  (auth)/        login, register
  (onboarding)/  first-run flow
  (main)/        protected app shell — statements, receipts, reports, custom-tables, workspaces
  transactions/  categories/  data-entry/  integrations/  storage/  settings/  audit/  admin/  upload/
  components/    reusable components
  contexts/      WorkspaceContext, NotificationContext, CurrencyDisplayContext
  hooks/         useAuth, usePermissions, useDashboard, useNotifications, useTour, …
  lib/           api client + formatting/util modules
  tours/         driver.js guided tours
  stories/       Storybook (*.stories.tsx)
```

Route groups in parentheses do not appear in the URL — they exist to give each area its own layout and auth boundary.

## The API client

`app/lib/api.ts` is a single Axios instance with two interceptors. Use it; do not call `fetch` directly.

**Request** — attaches `Authorization: Bearer <access_token>` and the `x-workspace-id` header from `currentWorkspaceId`. Every tenant-scoped call depends on that header, so a request made outside this client silently hits the wrong tenant boundary or 403s.

**Response** — on a 401, refreshes once via `/auth/refresh` and replays the original request. `/auth/login`, `/auth/register`, `/auth/refresh` are excluded from the retry path so a bad password does not loop. If the refresh fails, tokens and workspace id are cleared and the user is bounced to login.

> Tokens currently live in `localStorage`. `.claude/rules/security.md` calls for `HttpOnly` `Secure` `SameSite=Strict` cookies — that migration is outstanding, and it is a known XSS exposure. Do not add new code that reads tokens from storage directly; go through the client.

## Workspace switching

`WorkspaceContext` owns the active workspace and persists it as `currentWorkspaceId`. Switching workspaces must invalidate cached data — stale rows from the previous workspace rendering under a new one looks exactly like a data leak to the user.

## Permissions in the UI

`usePermissions()` mirrors the backend vocabulary. Hide or disable what the API would reject — but the UI is convenience, never enforcement. The server check in [Multi-Tenancy & RBAC](Multi-Tenancy-and-RBAC) is the real gate.

## i18n

Intlayer v7 + next-intlayer, three locales: English, Russian, Kazakh. Content sits in colocated `*.content.ts` files next to the component.

`intlayer build` runs on `prebuild` and `postinstall`. Removing the Intlayer config breaks both `npm install` and `npm run build` — it is not an optional dependency.

Every user-facing string goes through content files. A hardcoded string is a bug in two of three locales.

## UI conventions

- MUI v7 + Emotion; themes in `theme.ts` / `mantine-theme.ts`, globals in `globals.scss`.
- Tables: TanStack Table v8 + TanStack Virtual — virtualize anything that can grow past a screen; statement imports routinely produce thousands of rows.
- Charts: ECharts via `echarts-for-react`.
- Icons: Lucide React. Drag & drop: `@dnd-kit`. Animation: framer-motion. PDF: react-pdf.
- Money formatting goes through `lib/format-money.ts` — never `toFixed(2)` inline. Dates go through `lib/format-datetime.ts`.
- Real-time updates arrive over `socket.io-client`; treat them as "refetch this" signals.

## Testing & Storybook

```bash
npm --prefix frontend test           # Vitest
make storybook                       # dev server on :6006
make storybook-build                 # static output
make storybook-download && make storybook-serve   # from CI artifacts
```

Stories are `*.stories.tsx`, categories: Components, Modals, Transactions, UI. Storybook builds on every PR and push to `main` as a GitHub Actions artifact.

## Lint

```bash
npm --prefix frontend run lint:fix   # runs Biome AND ESLint
npm --prefix frontend run type-check
```

Both linters run in CI. Passing one is not passing.

## Performance

`.claude/rules/frontend-perf.md` is the reference. In practice: virtualize long lists, memoize expensive derivations, keep Server Components server-side, lazy-load heavy widgets (charts, PDF viewer), and avoid refetch storms when the workspace or filters change.
