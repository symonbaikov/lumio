import { describe, expect, it } from 'vitest';

import {
  areAllVisibleSelected,
  toggleSelectAllVisible,
  toggleStatementSelection,
} from '../statement-selection';

describe('statement selection helpers', () => {
  it('toggles statement id in selected list', () => {
    expect(toggleStatementSelection([], 'a')).toEqual(['a']);
    expect(toggleStatementSelection(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('detects when all visible statements are selected', () => {
    expect(areAllVisibleSelected(['a', 'b', 'c'], ['a', 'c'])).toBe(true);
    expect(areAllVisibleSelected(['a'], ['a', 'c'])).toBe(false);
    expect(areAllVisibleSelected(['a'], [])).toBe(false);
  });

  it('selects all visible without duplicating ids', () => {
    expect(toggleSelectAllVisible(['x', 'a'], ['a', 'b', 'c'], true)).toEqual(['x', 'a', 'b', 'c']);
  });

  it('deselects only visible ids and keeps other selected ids', () => {
    expect(toggleSelectAllVisible(['x', 'a', 'b', 'c'], ['a', 'c'], false)).toEqual(['x', 'b']);
  });
});
