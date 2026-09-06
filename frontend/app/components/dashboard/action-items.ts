import { AlertTriangle, Flag, Inbox, Receipt, Tag } from '@/app/components/icons';
import type { DashboardData } from '@/app/hooks/useDashboard';
import type React from 'react';

export type ActionPriority = 'critical' | 'warning' | 'info' | 'success';

export interface MappedAction {
  type: string;
  count: number;
  label: string;
  href: string;
  priority: ActionPriority;
}

const ACTION_ICON_MAP: Record<string, React.ComponentType<{ size: number }>> = {
  payments_overdue: AlertTriangle,
  transactions_uncategorized: Tag,
  parsing_warnings: Flag,
  receipts_pending_review: Receipt,
};

export function actionIcon(type: string): React.ComponentType<{ size: number }> {
  return ACTION_ICON_MAP[type] || Inbox;
}

const ACTION_PRIORITY_MAP: Record<string, ActionPriority> = {
  payments_overdue: 'critical',
  statements_pending_review: 'warning',
  receipts_pending_review: 'warning',
  statements_pending_submit: 'warning',
};

export function resolveActionPriority(type: string): ActionPriority {
  return ACTION_PRIORITY_MAP[type] || 'info';
}

export function actionIcoClass(priority: ActionPriority): string {
  return `lumio-dashboard__action-ico--${priority}`;
}

/** Backend action items plus a synthetic "parsing issues" row when warnings exist. */
export function buildMappedActions(
  data: Pick<DashboardData, 'actions' | 'dataHealth'>,
  parsingIssuesLabel: string,
): MappedAction[] {
  const actions: MappedAction[] = (data.actions || []).map(a => ({
    ...a,
    priority: resolveActionPriority(a.type),
  }));
  if (data.dataHealth?.parsingWarnings > 0) {
    actions.push({
      type: 'parsing_warnings',
      count: data.dataHealth.parsingWarnings,
      label: parsingIssuesLabel,
      href: '/statements?filter=has_errors',
      priority: 'warning',
    });
  }
  return actions;
}
