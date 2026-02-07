import { describe, expect, it } from 'vitest';

import {
  getStatementMerchantLabel,
  hasProcessingStatements,
  isStatementProcessingStatus,
} from '../statement-status';

describe('statement status helpers', () => {
  it('marks uploaded and processing as in-progress statuses', () => {
    expect(isStatementProcessingStatus('uploaded')).toBe(true);
    expect(isStatementProcessingStatus('processing')).toBe(true);
  });

  it('does not treat parsed/completed/error as in-progress', () => {
    expect(isStatementProcessingStatus('parsed')).toBe(false);
    expect(isStatementProcessingStatus('completed')).toBe(false);
    expect(isStatementProcessingStatus('error')).toBe(false);
  });

  it('detects when list contains at least one in-progress statement', () => {
    expect(hasProcessingStatements([{ status: 'completed' }, { status: 'uploaded' }])).toBe(true);
  });

  it('returns false when list has no in-progress statements', () => {
    expect(
      hasProcessingStatements([{ status: 'parsed' }, { status: 'completed' }, { status: null }]),
    ).toBe(false);
  });

  it('returns scanning label while statement is processing', () => {
    expect(getStatementMerchantLabel('processing', 'Kaspi', 'Scanning...')).toBe('Scanning...');
  });

  it('returns merchant label after processing is completed', () => {
    expect(getStatementMerchantLabel('completed', 'Kaspi', 'Scanning...')).toBe('Kaspi');
  });
});
