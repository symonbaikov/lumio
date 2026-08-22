const CYRILLIC_RE = /[\u0400-\u04FF]/;
const MOJIBAKE_HINT_RE = /[ÐÑÃÂ]/;
// biome-ignore lint/suspicious/noControlCharactersInRegex: управляющие символы вырезаются намеренно
const UNSAFE_ARCHIVE_CHARS_RE = /[\x00-\x1f\x7f]/g;

function scoreCyrillic(value: string): number {
  const matches = value.match(/[\u0400-\u04FF]/g);
  return matches ? matches.length : 0;
}

/**
 * Fixes typical mojibake when UTF-8 bytes were interpreted as latin1/cp1252
 * (e.g. "ÐÑÐ¸Ð¼ÐµÑ.pdf" -> "Пример.pdf").
 */
export function normalizeFilename(input: string): string {
  const name = (input || '').trim();
  if (!name) {
    return name;
  }

  // If it already contains Cyrillic, keep as-is.
  if (CYRILLIC_RE.test(name)) {
    return name;
  }

  // Heuristic: only attempt decoding when it looks like classic UTF-8->latin1 mojibake.
  if (!MOJIBAKE_HINT_RE.test(name)) {
    return name;
  }

  const decoded = Buffer.from(name, 'latin1').toString('utf8').trim();

  // If decoding produced replacement characters, it's likely wrong.
  if (!decoded || decoded.includes('�')) {
    return name;
  }

  // Prefer the version with more Cyrillic characters.
  const decodedCyr = scoreCyrillic(decoded);
  const originalCyr = scoreCyrillic(name);
  if (decodedCyr > originalCyr) {
    return decoded;
  }

  return name;
}

export function sanitizeArchiveEntryName(input: string): string {
  const normalized = normalizeFilename(input || '');
  const basename = normalized.replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'file';
  const sanitized = basename.replace(UNSAFE_ARCHIVE_CHARS_RE, '_').trim();
  return sanitized || 'file';
}
