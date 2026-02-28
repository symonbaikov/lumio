'use client';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface DashboardHeroProps {
  title: string;
  workspaceName?: string;
  primaryValue?: string;
  subtitle?: string;
  actionsSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export function DashboardHero({
  title,
  workspaceName,
  primaryValue,
  subtitle,
  actionsSlot,
  rightSlot,
}: DashboardHeroProps) {
  return (
    <Card className="relative overflow-hidden rounded-3xl border-0 bg-white shadow-[0_24px_60px_-30px_rgba(2,132,199,0.45)]">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#0284c7] via-[#38bdf8] to-[#0284c7]" />
      <CardContent className="relative z-10 flex flex-col gap-6 px-6 pb-6 pt-7 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8">
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            <Sparkles className="h-4 w-4" /> Enterprise Dashboard
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">{workspaceName ?? 'Workspace'}</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl font-ibm-plex-sans">
              {title}
            </h1>
            {subtitle ? <p className="text-base text-slate-500">{subtitle}</p> : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Total Balance
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900 font-ibm-plex-sans drop-shadow-[0_10px_30px_rgba(2,132,199,0.18)]">
                {primaryValue ?? '—'}
              </span>
              <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
                Live
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {actionsSlot}
            <Link href="/reports">
              <Button className="gap-2 rounded-full bg-[#0284c7] px-4 py-2 text-white shadow-[0_10px_30px_-10px_rgba(2,132,199,0.7)] hover:bg-[#0369a1]">
                Reports
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          {rightSlot}
        </div>
      </CardContent>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(2,132,199,0.08),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.08),transparent_28%),radial-gradient(circle_at_90%_80%,rgba(2,132,199,0.06),transparent_32%)]" />
    </Card>
  );
}
