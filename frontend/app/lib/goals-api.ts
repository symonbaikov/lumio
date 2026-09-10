import { apiQuery } from './query-fn';

export type GoalFlowNodeKind = 'goal' | 'budget' | 'category' | 'merchant' | 'other';

export interface GoalFlowNode {
  /** `<kind>:<id>`. Sankey links address nodes by this, so it is unique. */
  id: string;
  kind: GoalFlowNodeKind;
  /** Empty on an `other` node: the rollup is labelled by the client. */
  name: string;
  /** Declared intent. Null below the budget level, where nothing was declared. */
  planned: number | null;
  actual: number;
  color: string | null;
  /** Set on the rolled-up tail only: how many merchants it stands for. */
  mergedCount?: number;
}

export interface GoalFlowLink {
  source: string;
  target: string;
  value: number;
}

export type BudgetPeriodType = 'weekly' | 'monthly' | 'quarterly' | 'annual';

export interface GoalFlowBudget {
  id: string;
  name: string;
  periodType: BudgetPeriodType;
  /** The limit as the user typed it, in the budget's own currency. */
  limitAmount: number;
  limitCurrency: string;
  /** That limit converted and scaled to one month, which is what the tree sums. */
  plannedMonthly: number;
  actualMonthly: number;
  /** The budget's native window — these figures match the budgets page. */
  nativePeriod: { start: string; end: string; actual: number };
  percentUsed: number;
  category: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
}

export interface GoalFlowResponse {
  goal: {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    remaining: number;
    targetDate: string | null;
  };
  month: string;
  /** Workspace currency. Every amount in the payload is already converted into it. */
  currency: string;
  plannedTotal: number;
  actualTotal: number;
  /** Positive means overspending against the declared plan. */
  variance: number;
  nodes: GoalFlowNode[];
  links: GoalFlowLink[];
  budgets: GoalFlowBudget[];
  /** Spending the tree cannot place: cash entries carry no category. */
  excluded: { cashAmount: number; cashEntryCount: number };
}

export function fetchGoalFlow(
  goalId: string,
  month: string,
  signal?: AbortSignal,
): Promise<GoalFlowResponse> {
  return apiQuery<GoalFlowResponse>({
    url: `/goals/${goalId}/flow`,
    params: { month },
    signal,
  });
}

export type GoalItemStatus = 'planned' | 'paid';

export interface GoalItem {
  id: string;
  name: string;
  estimatedAmount: number;
  /** What it really cost. Null while the line is still only a plan. */
  actualAmount: number | null;
  currency: string;
  /** `YYYY-MM`, or null for a cost with no date yet. */
  dueMonth: string | null;
  status: GoalItemStatus;
  note: string | null;
  createdAt: string;
}

export interface GoalItemsResponse {
  /** The goal's currency. Every figure in `summary` is converted into it. */
  currency: string;
  items: GoalItem[];
  summary: {
    estimatedTotal: number;
    /** The actual where known, the estimate until then. */
    committedTotal: number;
    paidTotal: number;
    outstanding: number;
    targetAmount: number;
    /** Target minus estimate; negative means the estimate outgrew the goal. */
    unallocated: number;
  };
}

export interface GoalItemPayload {
  name: string;
  estimatedAmount: number;
  actualAmount?: number | null;
  currency?: string;
  dueMonth?: string | null;
  status?: GoalItemStatus;
  note?: string | null;
}

export type GoalPlanStatus = 'reached' | 'no_deadline' | 'on_track' | 'tight' | 'not_feasible';

export interface GoalPlanResponse {
  goalId: string;
  /** Workspace currency. Every amount below is converted into it. */
  currency: string;
  target: { declared: number; estimated: number; unallocated: number };
  saved: number;
  remaining: number;
  targetDate: string | null;
  /** Months left including the current one. Zero once the date has passed. */
  monthsLeft: number | null;
  requiredPerMonth: number | null;
  pace: { perMonth: number; monthsObserved: number };
  /** `month` is null when nothing is being contributed, so there is no arrival. */
  forecast: { month: string | null; monthsLate: number | null };
  capacity: { income: number; committed: number; free: number };
  /** Required minus free. Positive is the shortfall to close. */
  gap: number | null;
  status: GoalPlanStatus;
}

export function fetchGoalPlan(goalId: string, signal?: AbortSignal): Promise<GoalPlanResponse> {
  return apiQuery<GoalPlanResponse>({ url: `/goals/${goalId}/plan`, signal });
}

export function fetchGoalItems(goalId: string, signal?: AbortSignal): Promise<GoalItemsResponse> {
  return apiQuery<GoalItemsResponse>({ url: `/goals/${goalId}/items`, signal });
}
