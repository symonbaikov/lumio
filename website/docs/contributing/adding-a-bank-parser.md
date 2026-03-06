---
title: Adding a Bank Parser
description: Extend the parsing pipeline with a new bank format
---

Bank-specific parsers live in the parsing module. Add a new parser when you want first-class support for a PDF
layout or CSV export.

## 1. Inspect the input

- Collect multiple statement samples
- Identify stable headers and line item formats
- Note currency, date, and locale differences

## 2. Add a parser class

Create a new parser in `backend/src/modules/parsing`:

- Implement the parser interface
- Normalize rows to the transaction DTO
- Include unit tests with a sample statement

## 3. Register with ParserFactory

Update the factory so it selects your parser when a statement matches the bank format.

## 4. Add fixtures

- Store sample files under `docs/statements-examples`
- Keep fixtures small and anonymized

## 5. Verify dedup and import

- Run `npm run test:golden` if available
- Import the sample file through the UI

## 6. Document the support

Add the bank to [Supported Banks](../reference/supported-banks).

Next: [Deployment](../deployment/docker)
