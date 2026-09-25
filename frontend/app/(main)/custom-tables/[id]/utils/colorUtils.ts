interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseHexFromColor(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.startsWith('#')) {
    const hex = trimmed.replace('#', '');
    if (hex.length === 3 || hex.length === 6) {
      return `#${hex}`;
    }
  }
  const match = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (match) {
    const r = Math.max(0, Math.min(255, Number(match[1])));
    const g = Math.max(0, Math.min(255, Number(match[2])));
    const b = Math.max(0, Math.min(255, Number(match[3])));
    const toHex = (n: number): string => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  return null;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map(c => c + c)
          .join('')
      : clean;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function parseRgbaColor(trimmed: string): RgbaColor | null {
  const match = trimmed.match(/rgba?\(([^)]+)\)/i);
  if (!match) {
    return null;
  }
  const parts = match[1].split(',').map(part => part.trim());
  if (parts.length < 3) {
    return null;
  }
  const r = Number(parts[0]);
  const g = Number(parts[1]);
  const b = Number(parts[2]);
  const a = parts.length >= 4 ? Number(parts[3]) : 1;
  if (![r, g, b, a].every(n => Number.isFinite(n))) {
    return null;
  }
  return {
    r: Math.max(0, Math.min(255, r)),
    g: Math.max(0, Math.min(255, g)),
    b: Math.max(0, Math.min(255, b)),
    a: Math.max(0, Math.min(1, a)),
  };
}

function expandHexSegment(hex: string, start: number, repeat: boolean): number {
  const s = hex[start];
  return Number.parseInt(repeat ? s + s : hex.slice(start, start + 2), 16);
}

function parseShortHex(hex: string): RgbaColor {
  const r = expandHexSegment(hex, 0, true);
  const g = expandHexSegment(hex, 1, true);
  const b = expandHexSegment(hex, 2, true);
  const a = hex.length === 4 ? Number.parseInt(hex[3] + hex[3], 16) / 255 : 1;
  return { r, g, b, a };
}

function parseLongHex(hex: string): RgbaColor {
  const r = expandHexSegment(hex, 0, false);
  const g = expandHexSegment(hex, 2, false);
  const b = expandHexSegment(hex, 4, false);
  const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

function parseHexColor(trimmed: string): RgbaColor | null {
  const hex = trimmed.replace('#', '');
  if (hex.length === 3 || hex.length === 4) {
    return parseShortHex(hex);
  }
  if (hex.length === 6 || hex.length === 8) {
    return parseLongHex(hex);
  }
  return null;
}

export function parseColor(value: string): RgbaColor | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('rgb')) {
    return parseRgbaColor(trimmed);
  }
  if (trimmed.startsWith('#')) {
    return parseHexColor(trimmed);
  }
  return null;
}

export function solidifyBackground({ value, isDark }: { value: string; isDark: boolean }): string {
  const fg = parseColor(value);
  if (!fg) {
    return value;
  }
  if (fg.a >= 0.999) {
    return value;
  }
  // Подложка тёмной темы — зелёно-серая поверхность ($lumio-color-surface-dk), не slate.
  const base = parseColor(isDark ? '#161b17' : '#ffffff');
  if (!base) {
    return value;
  }
  const blend = (c: number, b: number): number => Math.round(fg.a * c + (1 - fg.a) * b);
  const r = blend(fg.r, base.r);
  const g = blend(fg.g, base.g);
  const b = blend(fg.b, base.b);
  return `rgb(${r}, ${g}, ${b})`;
}
