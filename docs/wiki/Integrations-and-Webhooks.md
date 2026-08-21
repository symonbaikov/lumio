# Integrations & Webhooks

## Dependency policy

**No new closed-SaaS SDKs.** New integration work uses open protocols that a self-hoster can point at their own server: SMTP, IMAP, WebDAV, S3-compatible object storage, OpenAI-compatible inference.

The `gmail`, `google-drive`, `google-sheets`, and `dropbox` modules predate that policy and exist for migration compatibility. Do not extend them.

## Configuration model

Integrations are configured **in the UI** (Integrations / Settings), stored per workspace, and secrets are encrypted at rest with `INTEGRATIONS_ENCRYPTION_KEY`. Environment variables (`AI_API_KEY`, `TELEGRAM_BOT_TOKEN`, SMTP vars) are **bootstrap fallbacks only** — the UI value wins.

That means: rotating a token is a UI action, not a redeploy, and a leaked env var is not the whole story when auditing access.

## Available integrations

| Integration | Configure at | Notes |
|---|---|---|
| S3-compatible storage | Integrations | MinIO or any S3 API — import/sync statement files |
| WebDAV storage | Integrations | Nextcloud or any WebDAV server |
| IMAP receipts | Integrations | Mailbox polling; parses merchant, amount, tax, line items and links receipts to transactions |
| SMTP email | Integrations | Workspace invitation emails. Unconfigured → the API returns the invite link and sends nothing |
| OpenAI-compatible endpoint | Integrations → AI-compatible endpoint | Ollama, LocalAI, vLLM. Powers auto-categorization, `GenericPdfParser`, insights, AI analysis. `AI_API_KEY` may be omitted for local endpoints |
| Telegram bot | Settings → Telegram | Token from [@BotFather](https://t.me/botfather), stored encrypted. Scheduled reports to a chat or channel |
| Workbook import | Integrations | XLSX / CSV / ODS into custom tables |
| Crypto wallets | Wallets | Read-only address tracking folded into stats |

## Outbound webhooks

Workspaces subscribe endpoints to events. Entity: `WebhookSubscription` (`entities/webhook-subscription.entity.ts`), modules: `webhook-subscriptions`, `webhook-endpoints`, `webhook-deliveries`.

Events (`WebhookEvent`):

| Event | Fires when |
|---|---|
| `transaction.created` | A transaction is persisted |
| `statement.processed` | An import session completes |
| `receipt.approved` | A receipt is approved |

A subscription has a `name`, `url`, `secret`, an `events` array, and an `isActive` flag; it cascades away with its workspace. Deliveries are recorded so you can inspect failures rather than guess.

Consumer side: treat a delivery as a **signal to refetch**, not as trusted state — verify the secret, and expect at-least-once delivery, so handlers must be idempotent.

Adding an event: extend the `WebhookEvent` enum, emit it where the state change is committed (after the DB transaction, not inside it), and document it here.

## Inbound webhooks

`POST /api/v1/webhooks/:token` and provider-specific routes (`telegram/webhook`, `webhook/gmail`). These are `@Public()` by necessity — the token in the path is the entire authentication, so treat it as a secret and never log the full URL.

## Adding an integration

1. Prefer an existing open protocol handler in `modules/open-protocol-integrations/` over a new module.
2. Store config per workspace, encrypted. Never a global singleton — this is a multi-tenant system.
3. Network calls need a timeout and a retry policy; a hanging third party must not hold a request thread.
4. Gate management routes behind `Permission.INTEGRATION_MANAGE`.
5. Never log credentials or full PII payloads — see [Operations & Observability](Operations-and-Observability).
6. Mock the external service in tests. No test hits a real provider.
