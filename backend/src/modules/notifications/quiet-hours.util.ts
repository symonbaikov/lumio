/**
 * Quiet hours are stored as local hours, so they have to be compared against the
 * clock the user actually reads — not the server's.
 */
export const getLocalHour = (date: Date, timeZone?: string | null): number => {
  if (!timeZone) {
    return date.getHours();
  }

  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false,
    }).format(date);
    const hour = Number.parseInt(formatted, 10);
    // Intl renders midnight as "24" in some ICU versions.
    return Number.isFinite(hour) ? hour % 24 : date.getHours();
  } catch {
    // Unknown time zone: fall back rather than silently muting notifications.
    return date.getHours();
  }
};

/**
 * True when `hour` falls inside the window. The window may wrap past midnight
 * (22 → 7), which is the common case, so a plain `start <= h < end` will not do.
 */
export const isWithinQuietHours = (
  hour: number,
  start: number | null | undefined,
  end: number | null | undefined,
): boolean => {
  if (start == null || end == null || start === end) {
    return false;
  }

  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
};
