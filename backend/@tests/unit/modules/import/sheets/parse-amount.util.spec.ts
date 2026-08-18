import { parseSheetAmount } from '../../../../../src/modules/import/sheets/parse-amount.util';

describe('parseSheetAmount', () => {
  it.each([
    [1234.5, 1234.5], // xlsx gives real numbers
    ['1234.5', 1234.5],
    ['1 200,50', 1200.5], // ru: space thousands, comma decimal
    ['1,200.50', 1200.5], // en: comma thousands, dot decimal
    ['1.200,50', 1200.5], // de: dot thousands, comma decimal
    ['-1 200,50 ₽', -1200.5],
    ['(1 200)', -1200], // accounting negative
    ['$1,200', 1200],
    ['12 345,67 ₸', 12345.67],
    ['1,200,300', 1200300], // en: multiple thousands groups, no decimal
    ['1.200.300', 1200300], // de: multiple thousands groups, no decimal
    ['  1 000 ', 1000], // nbsp
  ])('parses %p as %p', (input, expected) => {
    expect(parseSheetAmount(input)).toBe(expected);
  });

  it.each(['', null, undefined, 'n/a', '—', 'итого'])('returns null for %p', input => {
    expect(parseSheetAmount(input)).toBeNull();
  });

  it('does not confuse a 3-digit group with a decimal', () => {
    expect(parseSheetAmount('1,200')).toBe(1200); // thousands
    expect(parseSheetAmount('1,20')).toBe(1.2); // decimal
  });
});
