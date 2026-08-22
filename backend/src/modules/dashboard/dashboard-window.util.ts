export interface DashboardWindow {
  since: Date;
  endDate: Date;
}

/** A rolling window of `days` days ending at `targetDate` (inclusive, end of day). */
export function getWindowBounds(days: number, targetDate: Date): DashboardWindow {
  const endDate = new Date(targetDate);
  endDate.setHours(23, 59, 59, 999);

  const since = new Date(endDate);
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  return { since, endDate };
}

/** The calendar month containing `anchorDate`, from day 1 00:00:00 to the last day 23:59:59.999. */
export function getMonthWindowBounds(anchorDate: Date): DashboardWindow {
  const since = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1, 0, 0, 0, 0);
  const endDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0, 23, 59, 59, 999);
  return { since, endDate };
}

/** Number of days in the calendar month containing `anchorDate`. */
export function daysInMonth(anchorDate: Date): number {
  return new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0).getDate();
}
