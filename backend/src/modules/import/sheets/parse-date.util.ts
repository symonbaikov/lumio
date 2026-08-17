const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  янв: 1,
  января: 1,
  feb: 2,
  february: 2,
  фев: 2,
  февраля: 2,
  mar: 3,
  march: 3,
  мар: 3,
  марта: 3,
  apr: 4,
  april: 4,
  апр: 4,
  апреля: 4,
  may: 5,
  май: 5,
  мая: 5,
  jun: 6,
  june: 6,
  июн: 6,
  июня: 6,
  jul: 7,
  july: 7,
  июл: 7,
  июля: 7,
  aug: 8,
  august: 8,
  авг: 8,
  августа: 8,
  sep: 9,
  sept: 9,
  september: 9,
  сен: 9,
  сентября: 9,
  oct: 10,
  october: 10,
  окт: 10,
  октября: 10,
  nov: 11,
  november: 11,
  ноя: 11,
  ноября: 11,
  dec: 12,
  december: 12,
  дек: 12,
  декабря: 12,
};

/**
 * Builds a UTC-midnight Date from raw year/month/day components, rejecting
 * impossible values (e.g. month 13, day 32, Feb 30) instead of letting the
 * JS `Date` constructor silently roll them over into a later date.
 */
const buildUtcDate = (year: number, month: number, day: number): Date | null => {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
};

/**
 * Parses a spreadsheet cell into a UTC-midnight Date.
 * Accepts a `Date` instance unchanged, an Excel serial number (1900 epoch),
 * an ISO `yyyy-mm-dd`(`Thh:mm:ss`) string, a day-first `dd[./-]mm[./-]yyyy`
 * string, a `dd <ru|en month name> yyyy` string, and falls back to
 * `Date.parse`. Returns null when the cell holds no parseable date.
 */
export const parseSheetDate = (raw: unknown): Date | null => {
  if (raw instanceof Date) {
    return raw;
  }

  if (typeof raw === 'number') {
    if (!(raw > 0 && raw < 100000)) {
      return null;
    }
    const ms = (raw - 25569) * 86400000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof raw !== 'string') {
    return null;
  }

  const s = raw.trim();
  if (!s) {
    return null;
  }

  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return buildUtcDate(Number(y), Number(m), Number(d));
  }

  const dayFirstMatch = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dayFirstMatch) {
    const [, d, m, y] = dayFirstMatch;
    return buildUtcDate(Number(y), Number(m), Number(d));
  }

  const monthNameMatch = s.match(/^(\d{1,2})\s+([a-zA-Zа-яА-Я]+)\s+(\d{4})$/);
  if (monthNameMatch) {
    const [, d, monthName, y] = monthNameMatch;
    const month = MONTHS[monthName.toLowerCase()];
    if (!month) {
      return null;
    }
    return buildUtcDate(Number(y), month, Number(d));
  }

  const parsed = Date.parse(s);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed);
};
