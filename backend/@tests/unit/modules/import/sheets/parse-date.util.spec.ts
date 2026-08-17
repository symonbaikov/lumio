import { parseSheetDate } from '../../../../../src/modules/import/sheets/parse-date.util';

describe('parseSheetDate', () => {
  it('parses an Excel serial number', () => {
    // xlsx returns 45000 for 2023-03-15 under the 1900 epoch
    expect(parseSheetDate(45000)?.toISOString().slice(0, 10)).toBe('2023-03-15');
  });
  it.each([
    ['2024-03-15', '2024-03-15'],
    ['15.03.2024', '2024-03-15'],
    ['15/03/2024', '2024-03-15'],
    ['15-03-2024', '2024-03-15'],
    ['15 марта 2024', '2024-03-15'],
    ['2024-03-15T10:22:00Z', '2024-03-15'],
  ])('parses %p', (input, expected) => {
    expect(parseSheetDate(input)?.toISOString().slice(0, 10)).toBe(expected);
  });
  it('prefers day-first for ambiguous 03/04/2024', () => {
    expect(parseSheetDate('03/04/2024')?.toISOString().slice(0, 10)).toBe('2024-04-03');
  });
  it.each(['', null, 'дата', '32.13.2024'])('returns null for %p', input => {
    expect(parseSheetDate(input)).toBeNull();
  });
  it('accepts a Date instance unchanged', () => {
    const d = new Date('2024-01-02T00:00:00Z');
    expect(parseSheetDate(d)).toEqual(d);
  });

  // Additional cases: non-zero-padded day/month and the JS Date rollover trap.
  it.each([
    ['5.3.2024', '2024-03-05'],
    ['5/3/2024', '2024-03-05'],
    ['5-3-2024', '2024-03-05'],
  ])('parses non-zero-padded %p', (input, expected) => {
    expect(parseSheetDate(input)?.toISOString().slice(0, 10)).toBe(expected);
  });

  it.each([
    '31.04.2024', // April has only 30 days - must not roll over to May
    '29.02.2023', // 2023 is not a leap year - must not roll over to March
    '15.00.2024', // month 0 is invalid
    '00.03.2024', // day 0 is invalid
    '15.13.2024', // month 13 is invalid
  ])('returns null for impossible date %p (no rollover)', input => {
    expect(parseSheetDate(input)).toBeNull();
  });

  it.each([-1, 0, 100000, 100001])('returns null for out-of-range Excel serial %p', input => {
    expect(parseSheetDate(input)).toBeNull();
  });

  it('parses month names case-insensitively', () => {
    expect(parseSheetDate('15 March 2024')?.toISOString().slice(0, 10)).toBe('2024-03-15');
    expect(parseSheetDate('15 МАРТА 2024')?.toISOString().slice(0, 10)).toBe('2024-03-15');
  });

  // There is deliberately no locale-guessing Date.parse fallback: it is
  // implementation-defined and typically resolves non-ISO strings in the
  // server's local timezone, which could silently shift the calendar day.
  // Inputs that don't match one of the explicit formats must return null.
  it.each([
    'March 15, 2024',
    '2024/03/15',
    'March 15 2024', // no day-before-month order supported outside dd-first formats
  ])('returns null for unsupported format %p (no timezone-dependent fallback)', input => {
    expect(parseSheetDate(input)).toBeNull();
  });
});
