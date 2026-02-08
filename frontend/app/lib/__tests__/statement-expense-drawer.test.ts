import { describe, expect, it } from 'vitest';

import {
  ALWAYS_ALLOW_STATEMENT_DUPLICATES,
  STATEMENTS_OPEN_EXPENSE_DRAWER_EVENT,
  WORLD_CURRENCY_CODES,
  buildCurrencySearchIndex,
  computeManualAmountFontSize,
  getCurrencySymbolForCode,
  hasPositiveManualAmount,
  resolveExpenseDrawerMode,
  sanitizeManualAmountInput,
  validateManualExpenseDraft,
} from '../statement-expense-drawer';

describe('statement expense drawer helpers', () => {
  it('always allows duplicate statements for uploads', () => {
    expect(ALWAYS_ALLOW_STATEMENT_DUPLICATES).toBe(true);
  });

  it('uses stable event name for opening drawer', () => {
    expect(STATEMENTS_OPEN_EXPENSE_DRAWER_EVENT).toBe('statements:open-expense-drawer');
  });

  it('resolves unsupported mode to scan by default', () => {
    expect(resolveExpenseDrawerMode('foo')).toBe('scan');
    expect(resolveExpenseDrawerMode('manual')).toBe('manual');
  });

  it('validates manual form required fields', () => {
    expect(
      validateManualExpenseDraft({ amount: '', currency: 'KZT', description: '', merchant: '' }),
    ).toEqual({ amount: false, merchant: false });

    expect(
      validateManualExpenseDraft({
        amount: '123.50',
        currency: 'KZT',
        description: '',
        merchant: 'Coffee place',
      }),
    ).toEqual({ amount: true, merchant: true });
  });

  it('keeps only numeric input and one decimal separator for amount', () => {
    expect(sanitizeManualAmountInput('12ab3')).toBe('123');
    expect(sanitizeManualAmountInput('12.3.4')).toBe('12.34');
    expect(sanitizeManualAmountInput('00,11')).toBe('00.11');
  });

  it('detects whether manual amount is a positive number', () => {
    expect(hasPositiveManualAmount('0')).toBe(false);
    expect(hasPositiveManualAmount('0.01')).toBe(true);
    expect(hasPositiveManualAmount('foo')).toBe(false);
  });

  it('includes world currency list with common currencies', () => {
    expect(WORLD_CURRENCY_CODES).toContain('USD');
    expect(WORLD_CURRENCY_CODES).toContain('EUR');
    expect(WORLD_CURRENCY_CODES).toContain('KZT');
  });

  it('builds searchable currency labels and filters by query', () => {
    const items = buildCurrencySearchIndex(['USD', 'KZT']);
    expect(items.some(item => item.code === 'USD')).toBe(true);
    expect(items.some(item => item.label.toLowerCase().includes('kzt'))).toBe(true);
  });

  it('returns symbol for selected currency code', () => {
    expect(getCurrencySymbolForCode('ILS')).not.toBe('ILS');
    expect(getCurrencySymbolForCode('KZT').length).toBeGreaterThan(0);
  });

  it('reduces manual amount font size as value grows', () => {
    const shortValueSize = computeManualAmountFontSize('1');
    const mediumValueSize = computeManualAmountFontSize('123456');
    const longValueSize = computeManualAmountFontSize('123456789012');

    expect(shortValueSize).toBeGreaterThan(mediumValueSize);
    expect(mediumValueSize).toBeGreaterThan(longValueSize);
    expect(longValueSize).toBeGreaterThanOrEqual(24);
  });
});
