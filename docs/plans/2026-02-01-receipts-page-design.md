# Receipts Page Design

## Goals
- Add a new "Receipts" page at `/receipts` that is visually identical to the existing Statements page.
- Keep the Receipts implementation independent so it can diverge later without impacting Statements.
- Add a Receipts nav item with a shopping cart icon and localized labels.
- Ensure breadcrumbs show "Receipts" correctly.

## Non-Goals
- Backend changes or new APIs.
- Functional differences between Statements and Receipts for now.

## Approach
- Create a dedicated page at `frontend/app/receipts/page.tsx` by copying `frontend/app/statements/page.tsx`.
- Rename the component to `ReceiptsPage` and point `useIntlayer` to a new `receiptsPage` dictionary.
- Copy `frontend/app/statements/page.content.ts` to `frontend/app/receipts/page.content.ts` and update labels to receipts-focused copy while keeping structure identical.
- Keep data flow unchanged (still uses `/statements` APIs) to preserve current functionality and UI behavior.

## Navigation and Breadcrumbs
- Add a navigation item in `frontend/app/components/Navigation.tsx` pointing to `/receipts`.
- Use `ShoppingCartIcon` from `@mui/icons-material/ShoppingCart` and size it consistently with existing MUI icons.
- Add `receipts` labels in `frontend/app/components/navigation.content.ts`.
- Add a breadcrumb label for `receipts` in `frontend/app/components/breadcrumbs.content.ts`.

## Data Flow and Error Handling
- Keep list loading, polling, upload modal, and preview modal logic identical to Statements.
- Preserve current error handling and toast notifications.

## Testing
- Manual verification:
  - `/receipts` renders the same layout as `/statements`.
  - Navigation item appears and highlights on `/receipts`.
  - Breadcrumbs show "Home / Receipts" (localized).
  - List, filters, upload modal, and preview modal behave the same as Statements.

## Future Work
- Introduce receipts-specific API endpoints and data fields.
- Diverge labels/filters as requirements emerge.
