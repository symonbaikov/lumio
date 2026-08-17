---
paths:
  - "backend/**"
---

# Database & Ledger Integrity Standards

## 1. Schema Management
- **Migrations Only**: No direct database schema modifications. All changes must be versioned through migration files.
- **Review Requirement**: Any migration that modifies existing data or drops columns requires a manual peer review and a backup plan.

## 2. Data Integrity
- **Foreign Keys**: Always use foreign key constraints. Do not rely on application-level integrity only.
- **Transactions**: State-changing operations involving multiple tables must be wrapped in a database transaction.
- **Audit Logs**: Any change to a ledger balance or critical setting must be logged in an immutable `audit_logs` table.

## 3. Financial Record Rules (Ledger)
- **Immutability**: Once a transaction is confirmed, it should be immutable. Corrections must be handled via reversal/adjustment entries, not by editing the original record.
- **Concurrency Control**: Use **Optimistic Locking** (version column) or **Pessimistic Locking** (`SELECT FOR UPDATE`) for balance updates to prevent race conditions.
- **Double-Entry Consistency**: Ensure that every debit has a corresponding credit across accounts.

## 4. Performance
- **Indexed Queries**: Every query used in high-traffic endpoints must be covered by a proper index.
- **Soft Delete**: Use `deletedAt` timestamps for business data. Physical deletion is reserved for temporary data or explicit user requests (GDPR).
