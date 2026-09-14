import { app } from 'electron';

export const DEV_URL = 'http://localhost:3000';

/**
 * Where the desktop shell points when packaged.
 *
 * Lumio is self-hosted, so there is no single correct address: this used to be
 * hardcoded to the project's own hosted instance, which is useless to anyone
 * running their own. Set LUMIO_APP_URL to your instance; the default assumes
 * the server runs on the same machine.
 */
export const DEFAULT_APP_URL = 'http://localhost:3000';

export const isDev = !app.isPackaged;

function normalizeUrl(value: string | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }
  try {
    const parsed = new URL(value.trim());
    // Anything but http(s) would be loaded as a local file or a custom scheme.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname);
  } catch {
    return null;
  }
}

export function getLoadURL(): string {
  if (isDev) {
    return DEV_URL;
  }
  return normalizeUrl(process.env.LUMIO_APP_URL) ?? DEFAULT_APP_URL;
}
