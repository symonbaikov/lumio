import { describe, expect, it } from 'vitest';

import {
  getFinancialDocumentStatusLabel,
  isLowConfidenceDocument,
  normalizeReceiptLineItems,
  toFinancialDocumentStatus,
} from '../financial-document';

describe('financial document helpers', () => {
  it('maps raw receipt statuses into shared workflow statuses', () => {
    expect(toFinancialDocumentStatus('draft')).toBe('draft');
    expect(toFinancialDocumentStatus('needs_review')).toBe('needs_review');
    expect(toFinancialDocumentStatus('approved')).toBe('approved');
    expect(toFinancialDocumentStatus('reviewed')).toBe('submitted');
    expect(toFinancialDocumentStatus('paid')).toBe('paid');
    expect(toFinancialDocumentStatus('unknown')).toBe('draft');
  });

  it('returns workflow labels for shared UI badges', () => {
    expect(getFinancialDocumentStatusLabel('draft')).toBe('Draft');
    expect(getFinancialDocumentStatusLabel('needs_review')).toBe('Needs review');
    expect(getFinancialDocumentStatusLabel('approved')).toBe('Approved');
    expect(getFinancialDocumentStatusLabel('submitted')).toBe('Submitted');
    expect(getFinancialDocumentStatusLabel('paid')).toBe('Paid');
  });

  it('flags low confidence results under 80%', () => {
    expect(isLowConfidenceDocument(0.79)).toBe(true);
    expect(isLowConfidenceDocument(0.8)).toBe(false);
    expect(isLowConfidenceDocument(undefined)).toBe(false);
  });

  it('falls back to a synthetic line item when receipt has no explicit line items', () => {
    expect(
      normalizeReceiptLineItems({
        amount: 12000,
        vendor: 'Acme Inc',
      }),
    ).toEqual([
      {
        description: 'Acme Inc',
        amount: 12000,
      },
    ]);
  });

  it('uses explicit line items when parser returned them', () => {
    expect(
      normalizeReceiptLineItems({
        amount: 12000,
        lineItems: [
          { description: 'Service fee', amount: 10000 },
          { description: 'Tax', amount: 2000 },
        ],
      }),
    ).toEqual([
      { description: 'Service fee', amount: 10000 },
      { description: 'Tax', amount: 2000 },
    ]);
  });
});
