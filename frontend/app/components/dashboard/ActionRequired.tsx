'use client';

import { Spinner } from '@/app/components/ui/spinner';
import type { DashboardActionItem } from '@/app/hooks/useDashboard';
import { ArrowUpRight } from 'lucide-react';
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

const priorityDot: Record<ActionPriority, string> = {
  critical: 'bg-[#D13D56]',
  warning: 'bg-[#F5A623]',
  info: 'bg-[#0584C7]',
  success: 'bg-[#0D9568]',
};

export function ActionRequired({ actions, emptyLabel, isLoading }: ActionRequiredProps) {
  if (!isLoading && actions.length === 0) {
    return (
      <p
        className="text-[13px] font-medium text-[#1CA06C]"
        style={{ fontFamily: 'var(--font-dashboard-sans)' }}
      >
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {actions.map(action => {
        const priority: ActionPriority = action.priority ?? 'info';
        const dot = priorityDot[priority];

        return (
          <Link
            key={action.type}
            href={action.href}
            className="group flex items-center justify-between py-1 transition-colors duration-150 hover:opacity-80"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`h-1.5 w-1.5 rounded-none shrink-0 ${dot}`} />
              <span
                className="text-[13px] text-[#2A364E] font-medium truncate"
                style={{ fontFamily: 'var(--font-dashboard-sans)' }}
              >
                {isLoading ? (
                  <Spinner className="size-3 inline" />
                ) : (
                  <>
                    <span className="font-bold">{action.count}</span>{' '}
                    <span className="font-normal">{action.label}</span>
                  </>
                )}
              </span>
            </div>
            <ArrowUpRight className="h-3 w-3 text-[#7A869B] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
          </Link>
        );
      })}
    </div>
  );
}
