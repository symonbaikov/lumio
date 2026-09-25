import { describe, expect, it } from 'vitest';
import { type ConditionalRule, conditionalStyleFor, matchesRule } from './conditionalRules';
import {
  type CustomTableColumn,
  type CustomTableGridRow,
  resolveCellBackground,
  resolveRowStyle,
} from './stylingUtils';

const row = (data: Record<string, unknown>): CustomTableGridRow =>
  ({ id: 'r1', rowNumber: 1, data }) as CustomTableGridRow;

const rule = (over: Partial<ConditionalRule>): ConditionalRule => ({
  id: 'r',
  col: 'amount',
  op: 'gt',
  value: '100',
  target: 'cell',
  style: { backgroundColor: '#fee' },
  ...over,
});

describe('matchesRule', () => {
  it('compares numbers numerically, not as text', () => {
    // Текстовое сравнение поставило бы '90' выше '100'.
    expect(matchesRule(rule({}), '900')).toBe(true);
    expect(matchesRule(rule({}), '90')).toBe(false);
  });

  it('does not fire when the cell is not numeric', () => {
    expect(matchesRule(rule({}), 'много')).toBe(false);
  });

  it('handles a comma decimal separator', () => {
    expect(matchesRule(rule({ op: 'gte', value: '1,5' }), '1,5')).toBe(true);
  });

  it('matches contains case-insensitively', () => {
    expect(matchesRule(rule({ op: 'contains', value: 'магн' }), 'Магнум')).toBe(true);
  });

  it('treats blank strings and empty arrays as empty', () => {
    expect(matchesRule(rule({ op: 'isEmpty' }), '   ')).toBe(true);
    expect(matchesRule(rule({ op: 'isEmpty' }), [])).toBe(true);
    expect(matchesRule(rule({ op: 'isNotEmpty' }), 'x')).toBe(true);
  });
});

describe('conditionalStyleFor', () => {
  it('styles only its own cell for a cell-scoped rule', () => {
    const rules = [rule({ target: 'cell' })];
    const r = row({ amount: '500', note: 'x' });

    expect(conditionalStyleFor(rules, r, 'amount')).toEqual({ backgroundColor: '#fee' });
    expect(conditionalStyleFor(rules, r, 'note')).toBeUndefined();
  });

  it('styles every cell for a row-scoped rule', () => {
    const rules = [rule({ target: 'row' })];
    const r = row({ amount: '500', note: 'x' });

    expect(conditionalStyleFor(rules, r, 'note')).toEqual({ backgroundColor: '#fee' });
  });

  it('lets a later rule override an earlier one', () => {
    const rules = [
      rule({ id: 'a', target: 'row', style: { backgroundColor: '#eee' } }),
      rule({ id: 'b', target: 'row', style: { backgroundColor: '#fee', bold: true } }),
    ];

    expect(conditionalStyleFor(rules, row({ amount: '500' }), 'amount')).toEqual({
      backgroundColor: '#fee',
      textFormat: { bold: true },
    });
  });

  it('returns undefined when nothing matches', () => {
    expect(conditionalStyleFor([rule({})], row({ amount: '5' }), 'amount')).toBeUndefined();
  });

  it('produces a SheetStyle shape so it merges with manual styling', () => {
    const rules = [rule({ style: { color: '#f00', bold: true } })];

    expect(conditionalStyleFor(rules, row({ amount: '500' }), 'amount')).toEqual({
      textFormat: { foregroundColor: '#f00', bold: true },
    });
  });
});

describe('resolveRowStyle', () => {
  it('paints the row for a row-scoped rule', () => {
    const rules = [rule({ target: 'row', style: { backgroundColor: '#fee', color: '#900' } })];

    expect(resolveRowStyle(row({ amount: '500' }), rules)).toEqual({
      backgroundColor: '#fee',
      color: '#900',
    });
  });

  it('ignores cell-scoped rules at row level', () => {
    expect(resolveRowStyle(row({ amount: '500' }), [rule({ target: 'cell' })])).toEqual({});
  });

  it('lets a manual fill win over the rule', () => {
    const r = { ...row({ amount: '500' }), styles: { manualFill: '#abc' } };

    expect(resolveRowStyle(r, [rule({ target: 'row' })])).toEqual({ backgroundColor: '#abc' });
  });
});

describe('resolveCellBackground', () => {
  const col = (style?: CustomTableColumn['style']): CustomTableColumn => ({
    id: 'c1',
    key: 'amount',
    title: 'Amount',
    type: 'number',
    position: 0,
    config: null,
    style,
  });

  it('falls back to the column colour', () => {
    const bg = resolveCellBackground({
      row: row({ amount: '1' }),
      col: col({ cell: { backgroundColor: '#eef' } }),
      rules: [],
    });
    expect(bg).toBe('#eef');
  });

  it('prefers the row background over the column colour', () => {
    const bg = resolveCellBackground({
      row: row({ amount: '1' }),
      col: col({ cell: { backgroundColor: '#eef' } }),
      rules: [],
      rowBackground: '#abc',
    });
    expect(bg).toBe('#abc');
  });

  it('prefers a matching cell rule over the row background', () => {
    const bg = resolveCellBackground({
      row: row({ amount: '500' }),
      col: col({ cell: { backgroundColor: '#eef' } }),
      rules: [rule({ target: 'cell' })],
      rowBackground: '#abc',
    });
    expect(bg).toBe('#fee');
  });

  it('lets an imported per-cell style win over the rule', () => {
    const r = { ...row({ amount: '500' }), styles: { amount: { backgroundColor: '#123' } } };
    const bg = resolveCellBackground({ row: r, col: col(), rules: [rule({ target: 'cell' })] });
    expect(bg).toBe('#123');
  });
});
