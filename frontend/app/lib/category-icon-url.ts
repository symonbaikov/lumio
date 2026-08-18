/** Resolves a category's stored `icon` value (an uploaded-file URL) to a displayable URL. */
export function resolveCategoryIconUrl(iconValue?: string | null): string | null {
  if (!iconValue) {
    return null;
  }
  if (iconValue.startsWith('http')) {
    return iconValue;
  }
  if (iconValue.startsWith('/uploads')) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const base = apiUrl.replace(/\/api\/v1$/, '') || '';
    return `${base}${iconValue}`;
  }
  return null;
}
