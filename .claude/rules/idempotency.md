---
paths:
  - "backend/**"
---

# Idempotency Standards for Financial Integrity

All critical write operations (Transactions, Transfers, Settings changes) must be idempotent to prevent duplicate data in case of network retries or client errors.

## Implementation Guidelines

### 1. Idempotency Keys
- Clients **MUST** provide a unique header/field (e.g., `X-Idempotency-Key` or `requestId`) for state-changing requests.
- The server must store the result of the first successful request associated with a key for a specific period (e.g., 24 hours).

### 2. Guard Checks
- Before executing a transaction, check if a record with the same unique business identifier (e.g., `bank_transaction_id`, `external_id`) already exists.
- Return `200 OK` (with the existing record) or `409 Conflict` (if processing) instead of creating a duplicate.

### 3. Atomic Operations
- Use Database Transactions (`BEGIN`, `COMMIT`, `ROLLBACK`) for operations that involve multiple tables.
- Ensure that "check-then-act" logic is atomic to avoid race conditions.

### 4. Safe Retries
- DELETE operations should be naturally idempotent (deleting a non-existent item is a no-op).
- PATCH operations should use specific updates rather than full overrides where possible.

## Ledger Record Integrity
- Every ledger entry must have a unique hash or signature to prevent tampering.
- Balance calculations must be derived from immutable transaction logs, not just stored as a single mutable column.
