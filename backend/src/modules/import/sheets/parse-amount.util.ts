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

  // only one kind of separator is present: it's a thousands separator if the
  // whole string is grouped in 3s around it (e.g. "1,200" or "1,200,300"),
  // otherwise it's a decimal separator (e.g. "1,20" or "1.5")
  const sep = lastComma >= 0 ? ',' : lastDot >= 0 ? '.' : '';
  if (!sep) {
    return s;
  }

  const thousandsPattern = new RegExp(`^\\d{1,3}(\\${sep}\\d{3})+$`);
  return thousandsPattern.test(s) ? s.split(sep).join('') : s.replace(sep, '.');
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

  // NBSP/narrow-NBSP thousand separators are handled incidentally below by
  // the allowlist strip (they get removed along with other non-numeric
  // characters); .trim() also strips them from the string's edges.
  let s = String(raw).trim();
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
