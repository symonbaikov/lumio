Pay Tab – Functional & UX Plan
1. Purpose of Pay Tab
The Pay tab represents the Accounts Payable workspace. Its purpose is to manage obligations to pay, track due dates, control approvals, and close payments by linking them to real transactions. The tab should not process payments, but manage their lifecycle.

2. What Appears in Pay
- Approved transactions

- Invoices and bills

- Manually created payment obligations

- Recurring payments (subscriptions, rent)

- Items marked as 'to pay'

3. Payment Lifecycle
Submit → Approve → Pay → Paid → Archived

Each item must have a clear state and transitions between states should be auditable.

4. Core Fields (Data Model)
- id

- vendor / counterparty

- amount

- currency

- due_date

- status (to_pay | scheduled | paid | overdue)

- linked_transaction_id (optional)

- source (statement | invoice | manual)

- recurring (boolean)

- created_at, updated_at

5. Must-Have Actions (MVP)
- Set due date

- Mark as paid

- Link to real transaction

- Edit amount/vendor

- Add comment

- Delete / archive

6. Filters & Views
- Overdue

- Due today

- Due this week

- Paid

- By vendor

- By amount

- By status

7. UI Structure
- Summary cards: To pay, Overdue, Due this week, Paid this month

- Table with columns: Vendor, Amount, Due date, Status, Source, Actions

- Status color coding

- Inline actions (Mark as paid, Edit, Link transaction)

8. Notifications
- In-app notifications for upcoming due dates

- Overdue warnings

- Optional email notifications (later phase)

9. Integrations
- Link payments to parsed bank transactions

- Export Pay list to Excel / Google Sheets

- Optional webhook events (payment_marked_as_paid)

10. Analytics
- Total upcoming payments

- Cash outflow forecast (7/30 days)

- Overdue amount

- Paid vs unpaid ratio

11. Phase 2 Features (Optional)
- Recurring payments automation

- Calendar view

- Approval chains

- Multi-currency handling

- Vendor profiles

- Team permissions (who can mark as paid)

12. Technical Notes
- Status transitions must be atomic

- Linking payment to transaction should auto-close item

- Support manual creation for invoices without bank movement

- Soft delete for auditability

13. Success Metrics
- % of Pay items closed

- Average time to payment

- Overdue rate

- User retention on Pay tab