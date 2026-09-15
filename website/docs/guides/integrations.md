---
title: Integrations
description: AI, mail, storage, inbox, sheets and Telegram
---

Integrations are configured in the app under **Integrations**, per workspace. Secrets are stored
encrypted. Env variables with the same purpose are only temporary fallback defaults for bootstrap.

## Catalog

| Integration | What it does |
|---|---|
| AI-compatible endpoint | Categorization and AI parsing through OpenAI, Anthropic, OpenRouter or an OpenAI-compatible backend — see [AI Categorization](ai-categorization) |
| Local categorization | Installs a local Transformers.js model for private receipt categorization |
| SMTP email | Sends workspace invitations, password reset links and email change confirmations |
| App URL | The public URL used in invitations and shared links |
| S3-compatible storage | Syncs statements with a bucket such as MinIO |
| WebDAV storage | Imports and syncs files from Nextcloud or another WebDAV server |
| IMAP inbox | Polls a mailbox for receipts and invoice attachments |
| Workbook / Google Sheets | Imports a sheet from a link into custom tables |
| Telegram | Scheduled reports to a chat or channel; set up in **Settings → Telegram** |

## Notes

- Endpoints and hosts saved here (AI, SMTP, S3, WebDAV, IMAP) must resolve to public addresses: the
  egress guard rejects private and loopback hosts when you save and again on every connection. A
  self-hosted AI model or SMTP relay on a private network goes in `AI_BASE_URL`/`AI_MODEL` or
  `SMTP_HOST`/`SMTP_FROM` on the server instead.
- Without SMTP, invitation links are still returned by the API, but password reset and email
  change cannot complete — their links travel only by email.
- The Telegram webhook needs `TELEGRAM_WEBHOOK_SECRET` on the backend.
- The Gmail, Google Drive and Dropbox modules remain for migrating existing connections; they are no
  longer offered in the catalog.
- Receipt maps use self-hosted services configured through env, not the catalog — see
  [Receipt Maps](receipt-maps).

Next: [AI Categorization](ai-categorization)
