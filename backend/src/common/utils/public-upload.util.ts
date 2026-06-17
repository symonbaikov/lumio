import { randomUUID } from 'node:crypto';

const CUSTOM_ICON_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export function isAllowedCustomIconMime(mimetype?: string | null): boolean {
  return Boolean(mimetype && CUSTOM_ICON_EXTENSIONS[mimetype]);
}

export function sanitizePublicUploadFilename(file: { mimetype?: string | null }): string {
  const extension = CUSTOM_ICON_EXTENSIONS[file.mimetype || ''];
  if (!extension) {
    throw new Error('Unsupported public upload type');
  }
  return `${randomUUID()}${extension}`;
}
