/** Where a projected outflow comes from. */
export type CommitmentSource = 'payable' | 'subscription';

/** A single known future outflow, already converted to the workspace currency. */
export interface DashboardCommitmentItem {
  /** YYYY-MM-DD the money is expected to leave. Overdue payables are pulled to today. */
  date: string;
  label: string;
  amount: number;
  source: CommitmentSource;
  sourceId: string;
  /** True for payables whose due date has already passed and are still unpaid. */
  isOverdue: boolean;
}

/** One day of the projected runway. */
export interface DashboardCommitmentDay {
  date: string;
  outflow: number;
  /** Opening balance minus every outflow up to and including this day. */
  balance: number;
}

export interface DashboardCommitmentsResponse {
  currency: string;
  horizonDays: number;
  /** All-time transaction balance at the start of the projection. */
  openingBalance: number;
  /** Sum of every dated commitment inside the horizon. */
  totalCommitted: number;
  /** Payables with no due date: real obligations, but not placeable on the curve. */
  unscheduledCommitted: number;
  days: DashboardCommitmentDay[];
  items: DashboardCommitmentItem[];
  lowestBalance: number;
  lowestBalanceDate: string;
  /** First day the projected balance goes negative, or null if it never does. */
  shortfallDate: string | null;
}
