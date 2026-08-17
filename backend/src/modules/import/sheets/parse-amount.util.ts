/**
 * Normalizes a cleaned numeric string (digits, ',' and '.' only) to a
 * dot-decimal string, resolving ru/en/de thousand vs. decimal separator
 * conventions.
 */
const normalizeSeparators = (s: string): string => {
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  if (lastDot >= 0 && lastComma >= 0) {
    // both present: the rightmost one is the decimal separator
    const decimalSep = lastDot > lastComma ? '.' : ',';
    const thousandSep = decimalSep === '.' ? ',' : '.';
    return s.split(thousandSep).join('').replace(decimalSep, '.');
  }

  // a single separator is decimal, unless it is a lone thousands group
  // (i.e. followed by exactly 3 digits, e.g. "1,200" or "1.200")
  const sep = lastComma >= 0 ? ',' : lastDot >= 0 ? '.' : '';
  if (!sep) {
    return s;
  }

  const lastIndex = sep === ',' ? lastComma : lastDot;
  const isThousandsGroup = s.length - lastIndex - 1 === 3 && s.indexOf(sep) === lastIndex;
  return isThousandsGroup ? s.split(sep).join('') : s.replace(sep, '.');
};

/**
 * Parses a spreadsheet cell into a number.
 * Handles ru/en/de thousand+decimal separator conventions, currency symbols,
 * nbsp, and accounting-style parenthesised negatives. Returns null when the
 * cell holds no parseable number.
 */
export const parseSheetAmount = (raw: unknown): number | null => {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  if (raw === null || raw === undefined) {
    return null;
  }

  let s = String(raw).replace(/ /g, ' ').trim();
  if (!s) {
    return null;
  }

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }

  // strip everything that is not a digit, separator or sign
  s = s.replace(/[^\d.,\-+ ]/g, '').trim();
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  s = s.replace(/\s/g, '');
  if (!(s && /\d/.test(s))) {
    return null;
  }

  s = normalizeSeparators(s);

  const value = Number(s);
  if (!Number.isFinite(value)) {
    return null;
  }
  return negative ? -value : value;
};
