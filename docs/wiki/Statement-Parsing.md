# Statement Parsing

The core pipeline: a file in, normalized categorized transactions out.

## Pipeline

```
Upload
 └─ SHA-256 file hash          → same hash in this workspace? return the existing statement
 └─ ParserFactoryService       → sniff bank + file type, pick the first parser that canParse()
 └─ parse()                    → ParsedStatement (raw rows)
 └─ Normalization              → dates, amounts, transaction type, merchant text cleaning
 └─ Quality gate + checksums   → column validation, auto-fix, quality metrics
 └─ ImportSession (processing) → progress pushed over Socket.IO
 └─ Persist transactions
 └─ ClassificationService      → learned workspace rules first, AI endpoint second
 └─ DeduplicationService       → fingerprint match across statements
 └─ ImportSession (complete)
```

Limits: 10 MB max upload, 30 s PDF parse timeout, 5 parallel uploads.

## Parsers

`backend/src/modules/parsing/parsers/`

| Parser | Input |
|---|---|
| `KaspiParser` | Kaspi Bank PDF — native table extraction |
| `BerekeNewParser` / `BerekeOldParser` | Bereke Bank PDF, two formats, shared `bereke-base` |
| `HapoalimParser` | Bank Hapoalim / Isracard PDF (Hebrew, RTL) |
| `ExcelParser` | XLSX / XLS |
| `CsvParser` | CSV with delimiter sniffing |
| `GenericPdfParser` | Any PDF — AI-assisted extraction via an OpenAI-compatible endpoint |
| OCR (`ocr.service.ts`) | PNG / JPG via Tesseract.js |

Order matters. `ParserFactoryService` holds an ordered list and takes the **first** parser whose `canParse()` returns true — native parsers before `GenericPdfParser`, which is the catch-all.

Bank detection is evidence-based: the factory pulls the header block (lines before the first date+amount line) and matches bank-name regexes in Latin, Cyrillic, and Hebrew, collecting `evidence` strings for the logs.

## The parser contract

```ts
export interface IParser {
  canParse(bankName: BankName, fileType: FileType, filePath: string, cachedText?: string): Promise<boolean>;
  parse(filePath: string, cachedText?: string): Promise<ParsedStatement>;
  getVersion?(): string;
}
```

`cachedText` is the already-extracted PDF text — **use it** instead of re-reading the file, PDF extraction is the expensive step.

`getVersion()` feeds the golden tests: bump it when output changes intentionally.

## Adding a bank parser

1. Get a real sample into `docs/statements-examples/` (redacted).
2. Dump the raw structure:
   ```bash
   npm --prefix backend run parse:tables -- /path/to/statement.pdf
   ```
3. Extend `BaseParser` or `BaseTabularParser` in `modules/parsing/parsers/`. Tabular banks usually only need column mapping.
4. Make `canParse()` strict — match on issuer markers, not on "it's a PDF". A loose `canParse()` steals files from other parsers because the factory takes the first match.
5. Register it in `ParserFactoryService`'s list, **before** `GenericPdfParser`.
6. Add the bank to `BankName` in `entities/statement.entity.ts` and to the frontend supported-banks page.
7. Add golden tests:
   ```bash
   GOLDEN_ENABLED=1 npm --prefix backend run test:golden
   ```
8. Check the result:
   ```bash
   npm --prefix backend run parse:debug -- /path/to/statement.pdf
   npm --prefix backend run parse:diff -- /path/to/old.pdf /path/to/new.pdf
   ```

## Debugging a bad import

| Symptom | Look at |
|---|---|
| Wrong parser chosen | Factory `evidence` in the logs; tighten the winning parser's `canParse()` |
| Dates or amounts off | `universal-date-parser.service.ts`, `universal-amount-parser.service.ts` — locale-aware, prefer fixing there over per-parser hacks |
| Columns shifted | `column-validation.service.ts`, `column-auto-fix.service.ts` |
| Totals do not reconcile | `checksum-validation.service.ts`, `checksum-auto-fix.service.ts` |
| Import rejected | `statement-quality-gate.service.ts` — quality metrics decide pass/fail |
| Duplicates | `intelligent-deduplication.service.ts` and the transaction fingerprint |

## Idempotency

Re-uploading the same file is a no-op by design: statements carry a SHA-256 `fileHash`, and upload endpoints accept an `Idempotency-Key` header persisted in the `IdempotencyKey` entity. Never bypass the hash check to "force" a re-import — delete the statement (soft delete via `deletedAt`) and upload again.
