---
title: Integrations
description: Gmail, Drive, Dropbox, Sheets, Telegram
---

Lumio integrations automate statement ingestion and reporting. Most integrations require OAuth credentials.

## Gmail receipts

- Connect Gmail to ingest receipts and bank notifications
- Uses Pub/Sub for watch notifications when enabled
- Supports bulk approve and reparse flows

## Google Drive

- Sync statements from Drive folders
- Supports OAuth-based account linking

## Dropbox

- Monitor Dropbox for new statement uploads
- OAuth access and refresh tokens stored securely

## Google Sheets

- Webhook-based updates for sheet rows
- Optional allowlists for spreadsheet IDs and sheet names

## Telegram bot

- Sends report summaries or notifications
- Configure bot token via `TELEGRAM_BOT_TOKEN`

## Required variables

All integration variables are documented in `backend/.env.all-options`.

Next: [AI Categorization](ai-categorization)
