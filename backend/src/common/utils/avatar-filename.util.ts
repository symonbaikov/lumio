import * as path from 'path';

const SAFE_CHARS_REGEX = /[^a-zA-Z0-9._-]/g;

export function sanitizeAvatarFilename(originalName: string, timestamp = Date.now()): string {
  const trimmed = (originalName || '').trim();
  const baseName = path.basename(trimmed || 'avatar');
  const parsed = path.parse(baseName);

  const safeStem = (parsed.name || 'avatar').replace(SAFE_CHARS_REGEX, '_').replace(/_+/g, '_');
  const normalizedStem = safeStem.replace(/^[_-]+|[_-]+$/g, '') || 'avatar';

  const safeExt = (parsed.ext || '').toLowerCase().replace(SAFE_CHARS_REGEX, '');
  const normalizedExt = safeExt?.startsWith('.') ? safeExt : '.jpg';

  return `${timestamp}-${normalizedStem}${normalizedExt}`;
}
