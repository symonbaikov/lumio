import { describe, expect, it } from 'vitest';
import {
  completenessTone,
  exportFileName,
  formatLineRef,
  issueTarget,
  linesForCategory,
  parseStep,
  parseTaxYear,
  suggestionEntries,
  taxYearOptions,
} from './tax-declaration.helpers';
import type { CategoryMapping, FormLine } from './tax-declaration.types';

const now = new Date('2026-09-13T12:00:00');

describe('tax declaration helpers', () => {
  it('falls back to the first step for an unknown step', () => {
    expect(parseStep('draft')).toBe('draft');
    expect(parseStep('nope')).toBe('profile');
    expect(parseStep(null)).toBe('profile');
  });

  it('defaults to the previous, finished year and accepts only offered years', () => {
    expect(taxYearOptions(now)).toEqual([2026, 2025, 2024, 2023]);
    expect(parseTaxYear(null, now)).toBe(2025);
    expect(parseTaxYear('2026', now)).toBe(2026);
    expect(parseTaxYear('1999', now)).toBe(2025);
  });

  it('colours the completeness score', () => {
    expect(completenessTone(85)).toBe('success');
    expect(completenessTone(84)).toBe('warning');
    expect(completenessTone(59)).toBe('error');
  });

  it('points issues at the place they are fixed', () => {
    expect(issueTarget('unmapped_categories')).toEqual({ kind: 'step', step: 'mapping' });
    expect(issueTarget('statement_coverage_gaps')).toEqual({
      kind: 'route',
      href: '/statements?upload=1',
    });
    expect(issueTarget('irregular_tracking')).toBeNull();
  });

  it('formats line and field references', () => {
    expect(formatLineRef('15', '112')).toBe('15 · 112');
    expect(formatLineRef('31–38', null)).toBe('31–38');
    expect(formatLineRef(null, null)).toBe('—');
  });

  it('offers a category only lines of its own direction and the exclusion line', () => {
    const lines = [
      { key: 'in', section: 'income' },
      { key: 'out', section: 'expense' },
      { key: 'skip', section: 'excluded' },
    ] as FormLine[];

    expect(linesForCategory(lines, 'expense').map(l => l.key)).toEqual(['out', 'skip']);
  });

  it('turns only suggestions into confirmations', () => {
    const categories = [
      { categoryId: 'a', status: 'suggested', lineKey: 'rent' },
      { categoryId: 'b', status: 'confirmed', lineKey: 'rent' },
      { categoryId: 'c', status: 'unmapped', lineKey: null },
    ] as CategoryMapping[];

    expect(suggestionEntries(categories)).toEqual([{ categoryId: 'a', lineKey: 'rent' }]);
  });

  it('names exported files by country and year', () => {
    expect(exportFileName('DE', 2025, 'pdf')).toBe('income-tax-de-2025.pdf');
  });
});
