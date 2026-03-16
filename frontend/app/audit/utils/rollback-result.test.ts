import { describe, expect, it } from 'vitest';
import { assertRollbackSucceeded } from './rollback-result';

describe('assertRollbackSucceeded', () => {
  it('throws message when rollback response reports failure', () => {
    expect(() =>
      assertRollbackSucceeded({ success: false, message: 'Missing before state for rollback' }),
    ).toThrow('Missing before state for rollback');
  });
});
