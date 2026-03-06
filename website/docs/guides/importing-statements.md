---
title: Importing Statements
description: Uploads, supported formats, and validation
---

Lumio accepts multiple statement formats and standardizes them into a consistent transaction model.

## Supported inputs

- Native PDFs (bank-specific parsers)
- CSV and XLSX exports
- Scanned PDFs via OCR
- Gmail receipts (PDF or HTML attachments)

See [Supported Banks](../reference/supported-banks) for the current list.

## Import flow

1. Upload a file from the Upload page.
2. Lumio detects the format and selects a parser.
3. Parsed transactions are shown in a review step.
4. Deduplication flags any conflicts.
5. Confirm to commit transactions to the workspace.

## Validation and dedup

- SHA-256 hashes identify duplicate statement files.
- Dedup heuristics compare date, amount, and description similarity.
- Conflicts are marked and can be resolved manually.

## Tips

- Use the same export date range for consistent results.
- Upload one account per file when possible.
- If a bank is unsupported, use CSV/XLSX or OCR as a fallback.

![Upload flow](/img/screenshots/upload.png)

Next: [Workspaces and RBAC](workspaces-and-rbac)
