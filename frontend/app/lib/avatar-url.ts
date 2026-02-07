const LEGACY_UPLOADS_PREFIX = '/uploads/user-avatars/';
const API_PATH = '/api/v1';

const normalizeBase = (value: string) => value.replace(/\/$/, '');

function resolveApiBaseForAssets(): string {
  const envApiBase = process.env.NEXT_PUBLIC_API_URL;

  if (envApiBase && /^https?:\/\//i.test(envApiBase)) {
    return normalizeBase(envApiBase);
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:3001${API_PATH}`;
    }
  }

  return envApiBase ? normalizeBase(envApiBase) : API_PATH;
}

function buildAvatarApiUrl(fileName: string): string {
  const safeFileName = encodeURIComponent(fileName);
  return `${resolveApiBaseForAssets()}/users/avatars/${safeFileName}`;
}

export function normalizeAvatarUrl(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null;

  if (avatarUrl.startsWith(LEGACY_UPLOADS_PREFIX)) {
    return buildAvatarApiUrl(avatarUrl.slice(LEGACY_UPLOADS_PREFIX.length));
  }

  if (avatarUrl.startsWith(`${API_PATH}/users/avatars/`)) {
    const fileName = avatarUrl.split('/').pop();
    return fileName ? buildAvatarApiUrl(decodeURIComponent(fileName)) : avatarUrl;
  }

  try {
    const parsed = new URL(avatarUrl);
    if (parsed.pathname.startsWith(LEGACY_UPLOADS_PREFIX)) {
      return buildAvatarApiUrl(parsed.pathname.slice(LEGACY_UPLOADS_PREFIX.length));
    }

    if (parsed.pathname.startsWith(`${API_PATH}/users/avatars/`)) {
      const fileName = parsed.pathname.split('/').pop();
      return fileName ? buildAvatarApiUrl(decodeURIComponent(fileName)) : avatarUrl;
    }
  } catch {
    return avatarUrl;
  }

  return avatarUrl;
}
