'use client';

import { Spinner } from '@/app/components/ui/spinner';
import type { DashboardActionItem } from '@/app/hooks/useDashboard';
import { ArrowUpRight, CircleAlert, FileText, Receipt, ShieldAlert, Tag, TriangleAlert } from 'lucide-react';
import Link from 'next/link';

type ActionPriority = 'critical' | 'warning' | 'info' | 'success';

interface ActionRequiredProps {
  actions: Array<
    DashboardActionItem & {
      priority: ActionPriority;
      ctaLabel?: string;
      periodLabel?: string;
    }
  >;
  title: string;
  emptyLabel: string;
  isLoading?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  statements_pending_submit: FileText,
  statements_pending_review: ShieldAlert,
  payments_overdue: CircleAlert,
  transactions_uncategorized: Tag,
  receipts_pending_review: Receipt,
  parsing_warnings: TriangleAlert,
};

const priorityDot: Record<ActionPriority, string> = {
  critical: 'bg-rose-400',
  warning: 'bg-amber-400',
  info: 'bg-blue-300',
  success: 'bg-emerald-400',
};

export function ActionRequired({ actions, emptyLabel, isLoading }: ActionRequiredProps) {
  if (!isLoading && actions.length === 0) {
    return (
      <p className="text-xs text-emerald-600 py-1">{emptyLabel}</p>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-slate-100">
      {actions.map(action => {
        const priority: ActionPriority = action.priority ?? 'info';
        const dot = priorityDot[priority];

        return (
          <Link
            key={action.type}
            href={action.href}
            className="group flex items-center justify-between py-2 first:pt-0 last:pb-0 transition-colors duration-150 hover:text-slate-700"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
              <span className="text-[13px] text-slate-500 truncate">
                {isLoading ? <Spinner className="size-3 inline" /> : (
                  <><span className="font-medium text-slate-700">{action.count}</span>{' '}{action.label}</>
                )}
              </span>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
          </Link>
        );
      })}
    </div>
  );
}
