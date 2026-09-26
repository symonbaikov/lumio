import { InvoiceRecurrenceInterval } from '../../entities/invoice.entity';

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The next date a recurring invoice's copy should be issued on. */
export function advanceIssueDate(issueDate: string, interval: InvoiceRecurrenceInterval): string {
  const date = parseDateOnly(issueDate);
  switch (interval) {
    case InvoiceRecurrenceInterval.WEEKLY:
      date.setUTCDate(date.getUTCDate() + 7);
      break;
    case InvoiceRecurrenceInterval.MONTHLY:
      date.setUTCMonth(date.getUTCMonth() + 1);
      break;
    case InvoiceRecurrenceInterval.QUARTERLY:
      date.setUTCMonth(date.getUTCMonth() + 3);
      break;
    case InvoiceRecurrenceInterval.YEARLY:
      date.setUTCFullYear(date.getUTCFullYear() + 1);
      break;
  }
  return formatDateOnly(date);
}

/** Keeps the same issue-to-due offset (in days) on a generated copy. */
export function shiftDueDate(
  oldIssueDate: string,
  oldDueDate: string,
  newIssueDate: string,
): string {
  const offsetDays = Math.round(
    (parseDateOnly(oldDueDate).getTime() - parseDateOnly(oldIssueDate).getTime()) / 86_400_000,
  );
  const due = parseDateOnly(newIssueDate);
  due.setUTCDate(due.getUTCDate() + offsetDays);
  return formatDateOnly(due);
}
