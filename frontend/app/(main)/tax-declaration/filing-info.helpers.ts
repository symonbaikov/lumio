/** A deadline counts as passed once its whole day, in the viewer's time zone, is over. */
export function isDeadlinePassed(date: string, now: Date = new Date()): boolean {
  return now.getTime() > new Date(`${date}T23:59:59`).getTime();
}

/** Parses a date-only value as a local day, so it is not shifted by the UTC offset. */
export function formatFilingDate(date: string, locale: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(locale);
}
