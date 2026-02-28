'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import type { DashboardRecentActivity } from '@/app/hooks/useDashboard';
import {
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  FileUp,
  Inbox,
  Receipt,
  ShieldOff,
  Tag,
} from 'lucide-react';
import Link from 'next/link';
import { subtleBadge } from './common';

interface RecentActivityProps {
  activities: DashboardRecentActivity[];
  formatAmount: (value: number) => string;
  title: string;
  emptyLabel: string;
}

type ActivityBucket = 'Today' | 'Yesterday' | 'This week' | 'Earlier';

const typeConfig: Record<string, { icon: React.ElementType; label: string; tone: string }> = {
  statement_upload: { icon: FileUp, label: 'Statement uploaded', tone: 'text-blue-700 bg-blue-50' },
  payment: { icon: Receipt, label: 'Payment recorded', tone: 'text-amber-700 bg-amber-50' },
  categorization: { icon: Tag, label: 'Category updated', tone: 'text-purple-700 bg-purple-50' },
  transaction: { icon: Receipt, label: 'Transaction updated', tone: 'text-gray-700 bg-gray-50' },
  import: { icon: Inbox, label: 'Import completed', tone: 'text-emerald-700 bg-emerald-50' },
  delete: { icon: ShieldOff, label: 'Item deleted', tone: 'text-rose-700 bg-rose-50' },
  update: { icon: FileText, label: 'Item updated', tone: 'text-slate-700 bg-slate-50' },
};

function bucketForDate(timestamp: string): ActivityBucket {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This week';
  return 'Earlier';
}

function normalizeTitle(activity: DashboardRecentActivity) {
  if (activity.title && !activity.title.match(/[0-9a-fA-F-]{8,}/)) return activity.title;
  const config = typeConfig[activity.type];
  return config?.label ?? 'Activity';
}

function formatContext(activity: DashboardRecentActivity) {
  if (activity.description) return activity.description;
  if (activity.type === 'payment' && activity.amount != null) return 'Payment recorded';
  if (activity.type === 'categorization') return 'Category updated';
  if (activity.type === 'statement_upload') return 'Statement uploaded';
  if (activity.type === 'import') return 'Import finished';
  if (activity.type === 'delete') return 'Item deleted';
  if (activity.type === 'update') return 'Item updated';
  return activity.type.replace(/_/g, ' ');
}

function groupActivities(activities: DashboardRecentActivity[]) {
  const buckets: Record<ActivityBucket, DashboardRecentActivity[]> = {
    Today: [],
    Yesterday: [],
    'This week': [],
    Earlier: [],
  };

  activities.forEach(act => {
    buckets[bucketForDate(act.timestamp)].push(act);
  });

  return (Object.entries(buckets) as [ActivityBucket, DashboardRecentActivity[]][])
    .filter(([, list]) => list.length > 0)
    .map(([bucket, list]) => ({ bucket, list }));
}

export function RecentActivity({
  activities,
  formatAmount,
  title,
  emptyLabel,
}: RecentActivityProps) {
  const groups = groupActivities(activities);

  return (
    <Card className="border-0 shadow-[0_22px_60px_-35px_rgba(2,132,199,0.45)] rounded-[24px] bg-white h-full relative overflow-hidden group/card text-left transition-all duration-300">
      <CardContent className="h-full pt-8 p-8 overflow-hidden relative z-10">
        {activities.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-[var(--ff-dash-muted)]">
            {emptyLabel}
          </div>
        ) : (
          <div className="space-y-6 h-full overflow-auto pr-6 scrollbar-hide text-left">
            {groups.map(group => (
              <div key={group.bucket} className="space-y-5">
                <div className="text-[11px] font-[700] uppercase tracking-[0.18em] text-slate-400">
                  {group.bucket}
                </div>
                <div className="flex flex-col gap-5">
                  {group.list.map(activity => {
                    const config = typeConfig[activity.type] ?? typeConfig.transaction;
                    const Icon = config.icon;
                    const titleText = normalizeTitle(activity);
                    const contextText = formatContext(activity);

                    return (
                      <Link
                        key={activity.id}
                        href={activity.href}
                        className="flex items-start gap-4 rounded-2xl border border-transparent bg-white/40 px-2 py-1 transition-all hover:border-sky-100 hover:bg-sky-50/40"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-100 transition-colors hover:bg-sky-50 hover:text-sky-700 hover:ring-sky-100">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="flex flex-col min-w-0 flex-1 justify-center">
                          <span className="block truncate text-[14px] font-[600] text-slate-900">
                            {titleText}
                          </span>
                          <span className="flex items-center gap-2 text-[12px] mt-0.5 text-slate-500 font-[400]">
                            <span className="truncate">{contextText}</span>
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-[600] uppercase tracking-[0.12em] text-slate-500">
                              {new Date(activity.timestamp).toLocaleDateString()}
                            </span>
                          </span>
                        </div>
                        {activity.amount != null ? (
                          <span className="flex items-center gap-1.5 text-[14px] font-[600] shrink-0 font-ibm-plex-sans tracking-tight">
                            {activity.amount >= 0 ? (
                              <ArrowUpRight className="h-4 w-4 text-emerald-500 stroke-[2.5]" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-slate-400 stroke-[2.5]" />
                            )}
                            <span
                              className={
                                activity.amount >= 0 ? 'text-emerald-600' : 'text-slate-600'
                              }
                            >
                              {formatAmount(Math.abs(activity.amount))}
                            </span>
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
