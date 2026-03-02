'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import { Spinner } from '@/app/components/ui/spinner';
import type { DashboardActionItem } from '@/app/hooks/useDashboard';
import { ArrowUpRight, CircleAlert, FileText, Receipt, ShieldAlert, Tag } from 'lucide-react';
import Link from 'next/link';
import { cardShell, priorityTone, subtleBadge } from './common';

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
};

export function ActionRequired({ actions, title, emptyLabel, isLoading }: ActionRequiredProps) {
  if (!isLoading && actions.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50 shadow-sm dark:border-emerald-400/40 dark:bg-emerald-500/10">
        <CardContent className="flex items-center gap-2 p-4 text-sm text-emerald-800 dark:text-emerald-100">
          <ShieldAlert className="h-5 w-5" />
          <span className="font-medium">{emptyLabel}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 h-full">
      {actions.map(action => {
        const Icon = iconMap[action.type] ?? FileText;
        const priority: ActionPriority = action.priority ?? 'info';
        const tone = priorityTone[priority];

        return (
          <Link
            key={action.type}
            href={action.href}
            className={`group flex items-center justify-between gap-4 rounded-[20px] border border-slate-100 bg-white px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(2,132,199,0.30)]`}
          >
            <div className="flex items-center gap-3 w-full">
              <span
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.bg} ${tone.text} shadow-sm ring-1 ring-inset ring-black/5`}
              >
                <Icon className="h-4 w-4" />
                {priority === 'critical' ? (
                  <span
                    className={`absolute -right-1 -top-1 h-2 w-2 rounded-full ${tone.dot} ring-2 ring-white animate-pulse`}
                  />
                ) : null}
              </span>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[18px] font-[600] tracking-tight leading-none text-slate-900 font-ibm-plex-sans">
                    {isLoading ? <Spinner className="size-4" /> : action.count}
                  </span>
                  <span
                    className={`${subtleBadge} ${tone.bg} ${tone.text} bg-white ring-1 ring-inset ${tone.ring} rounded-full px-2 py-[2px] text-[10px] font-bold tracking-wide uppercase`}
                  >
                    {action.priority}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                  <span className="text-[13px] font-[500] text-slate-700 truncate">
                    {action.label}
                  </span>
                  {action.periodLabel ? (
                    <span className="text-[11px] font-[400] text-slate-400 shrink-0">
                      • {action.periodLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-50 text-blue-600 opacity-80 group-hover:opacity-100 group-hover:bg-blue-50 transition-all">
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-[1px] group-hover:-translate-y-[1px]" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
