---
title: Parsing Pipeline
description: Upload -> parse -> classify -> deduplicate
---

The parsing pipeline is designed for reliability and repeatability. Every import is tracked as a session and can
be audited or retried.

## Pipeline stages

1. **Upload**
   - File stored in `uploads/`
   - SHA-256 hash computed for deduplication

2. **Parser selection**
   - `ParserFactory` chooses a bank-specific parser when available
   - Fallback parsers handle CSV/XLSX and generic AI/OCR paths

3. **Import session**
   - An `import_session` record is created
   - Metadata stores parser, source, and status

4. **Transaction extraction**
   - Parsed rows are normalized into `transaction` entities
   - Source mapping is stored for traceability

5. **AI categorization**
   - Optional AI pipeline (Gemini/OpenRouter)
   - Confidence thresholds and retry logic guard quality

6. **Deduplication**
   - Hash checks plus heuristics on date/amount/text
   - Conflicts flagged for manual review

## Error handling

- Parsing errors are captured on the import session
- Failed stages can be retried without reuploading
- Logs include structured context for diagnostics

## Related code

- `backend/src/modules/parsing`
- `backend/src/modules/import`
- `backend/src/modules/classification`

Next: [Importing Statements](../guides/importing-statements)
