import {
  FormulaError,
  assertValidFormula,
  evaluateFormula,
  tokenizeFormula,
} from '../../../src/modules/custom-tables/helpers/formula-evaluator';

describe('evaluateFormula', () => {
  const row = { amount: '1000', rate: '0.2', qty: 3, paid: true, note: 'текст' };

  it('respects operator precedence', () => {
    expect(evaluateFormula('[amount] + [qty] * 2', row)).toBe(1006);
  });

  it('respects parentheses', () => {
    expect(evaluateFormula('([amount] + [qty]) * 2', row)).toBe(2006);
  });

  it('computes a VAT-style expression', () => {
    expect(evaluateFormula('[amount] * [rate]', row)).toBeCloseTo(200);
  });

  it('treats an empty cell as zero rather than failing the whole column', () => {
    expect(evaluateFormula('[amount] + [missing]', row)).toBe(1000);
  });

  it('accepts a comma decimal separator', () => {
    expect(evaluateFormula('[x] * 2', { x: '1,5' })).toBe(3);
  });

  it('returns null on division by zero instead of Infinity', () => {
    expect(evaluateFormula('[amount] / [zero]', { amount: '10', zero: '0' })).toBeNull();
  });

  it('returns null when a referenced cell is not a number', () => {
    expect(evaluateFormula('[note] + 1', row)).toBeNull();
  });

  it('returns null for a malformed expression instead of throwing', () => {
    expect(evaluateFormula('[amount] +', row)).toBeNull();
    expect(evaluateFormula('([amount]', row)).toBeNull();
  });

  it('does not execute code embedded in the expression', () => {
    // Ключевое свойство: выражение разбирается, а не исполняется.
    expect(evaluateFormula('process.exit(1)', row)).toBeNull();
    expect(evaluateFormula('[amount].constructor', row)).toBeNull();
  });
});

describe('tokenizeFormula', () => {
  it('rejects characters outside the supported grammar', () => {
    expect(() => tokenizeFormula('[a] % 2')).toThrow(FormulaError);
  });

  it('rejects an over-long expression', () => {
    expect(() => tokenizeFormula('1+'.repeat(400))).toThrow(/too long/);
  });
});

describe('assertValidFormula', () => {
  it('accepts a formula over known columns', () => {
    expect(() => assertValidFormula('[a] + [b]', ['a', 'b'])).not.toThrow();
  });

  it('rejects a reference to a missing column', () => {
    expect(() => assertValidFormula('[a] + [ghost]', ['a'])).toThrow(/Column not found/);
  });

  it('rejects unbalanced parentheses', () => {
    expect(() => assertValidFormula('([a] + 1', ['a'])).toThrow(/parenthesis/);
  });

  it('rejects an empty formula', () => {
    expect(() => assertValidFormula('   ', [])).toThrow(/is empty/);
  });
});
