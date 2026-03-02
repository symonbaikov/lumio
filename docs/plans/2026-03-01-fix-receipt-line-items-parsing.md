# Fix Receipt Line-Items Parsing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent receipt line items from being polluted by date/address/sentence lines and guard against line-item sums that dwarf totals.

**Architecture:** Tighten line-item extraction filters in both Gmail and Universal parsers, then add a total-vs-line-item sum guard in receipt parsing. Ensure behavior via focused unit tests.

**Tech Stack:** NestJS (TypeScript), Jest

---

### Task 1: Line-Item Filtering Heuristics

**Files:**
- Modify: `backend/src/modules/gmail/services/gmail-receipt-parser.service.ts`
- Modify: `backend/src/modules/parsing/services/universal-extractor.service.ts`
- Test: `backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts`

**Step 1: Write the failing tests**

```typescript
describe('line item extraction filters', () => {
  it('skips date-range-like descriptions', async () => {
    const lineItems = await (service as any).extractLineItems(
      'Feb 27, 2026-Mar 15,2026 202.00\nTotal 202.00',
    );

    expect(lineItems).toEqual([]);
  });

  it('skips address-like descriptions', async () => {
    const lineItems = await (service as any).extractLineItems(
      'San Francisco, CA 94107 941.00\nTotal 941.00',
    );

    expect(lineItems).toEqual([]);
  });

  it('skips sentence-like descriptions', async () => {
    const lineItems = await (service as any).extractLineItems(
      'Thanks for your purchase! 202.00\nTotal 202.00',
    );

    expect(lineItems).toEqual([]);
  });

  it('accepts a normal line item', async () => {
    const lineItems = await (service as any).extractLineItems('GitHub Actions 10.00');

    expect(lineItems).toEqual([{ description: 'GitHub Actions', amount: 10 }]);
  });
});
```

**Step 2: Run tests to verify failure**

Run: `cd backend && npm run test -- @tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts`

Expected: FAIL for the date-range/address/sentence filters before implementation.

**Step 3: Implement minimal filtering**

```typescript
if (this.isLikelySentence(description)) continue;
if (this.isDateRangeLike(description)) continue;
if (this.isAddressLike(description)) continue;
if (this.isYearLikeAmount(amount, hasExplicitCurrency)) continue;
```

Ensure `isDateRangeLike` supports month-name ranges like `Feb 27, 2026 - Mar 15`.

**Step 4: Run tests to verify pass**

Run: `cd backend && npm run test -- @tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts \
  backend/src/modules/gmail/services/gmail-receipt-parser.service.ts \
  backend/src/modules/parsing/services/universal-extractor.service.ts
git commit -m "fix(receipts): filter non-line-item text"
```

---

### Task 2: Guard Against Line-Item Sum Outliers

**Files:**
- Modify: `backend/src/modules/gmail/services/gmail-receipt-parser.service.ts`
- Test: `backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts`

**Step 1: Write the failing test**

```typescript
it('drops line items when their sum dwarfs the total', async () => {
  const pdfText = [
    'GitHub',
    'Feb 27, 2026 - Mar 15, 2026 202.00',
    'San Francisco, CA 94107 941.00',
    'Total: $17.61',
  ].join('\n');

  jest.spyOn(pdfParse as any, 'default').mockResolvedValue({ text: pdfText });

  const parser = new GmailReceiptParserService(new UniversalAmountParser());
  const parsed = await (parser as any).parsePdfReceipt(Buffer.from('x'), {});

  expect(parsed.lineItems).toEqual([]);
  expect(parsed.amount).toBe(17.61);
});
```

**Step 2: Run tests to verify failure**

Run: `cd backend && npm run test -- @tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts`

Expected: FAIL (line items are present before guard)

**Step 3: Implement guard in parsePdfReceipt**

```typescript
if (lineItems.length > 0 && amount !== undefined) {
  const lineItemsSum = lineItems.reduce((sum, item) => sum + item.amount, 0);
  if (lineItemsSum > amount * 2) {
    lineItems.length = 0;
  }
}
```

**Step 4: Run tests to verify pass**

Run: `cd backend && npm run test -- @tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts \
  backend/src/modules/gmail/services/gmail-receipt-parser.service.ts
git commit -m "fix(receipts): ignore outlier line items"
```

---

### Task 3: GitHub-Like Receipt Integration Test

**Files:**
- Test: `backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts`

**Step 1: Write the failing test**

```typescript
it('handles GitHub-like receipt text without polluted line items', async () => {
  const pdfText = [
    'GitHub',
    'Thanks for your purchase!',
    'Feb 27, 2026 - Mar 15, 2026',
    'San Francisco, CA 94107',
    'Total: $17.61',
  ].join('\n');

  jest.spyOn(pdfParse as any, 'default').mockResolvedValue({ text: pdfText });

  const parser = new GmailReceiptParserService(new UniversalAmountParser());
  const parsed = await (parser as any).parsePdfReceipt(Buffer.from('x'), {});

  expect(parsed.amount).toBe(17.61);
  expect(parsed.lineItems).toEqual([]);
});
```

**Step 2: Run tests to verify failure**

Run: `cd backend && npm run test -- @tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts`

Expected: FAIL before Task 1/2; PASS after.

**Step 3: Run tests to verify pass**

Run: `cd backend && npm run test -- @tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts`

Expected: PASS

**Step 4: Commit**

```bash
git add backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts
git commit -m "test(receipts): cover GitHub receipt parsing"
```
