'use client';

import { Button } from '@/app/components/ui/button';
import { Download, FileUp, ListChecks } from 'lucide-react';
import Link from 'next/link';

const staticActions = [
  { key: 'upload' as const, label: 'Upload / Parse', href: '/statements/submit', icon: FileUp },
  { key: 'review' as const, baseLabel: 'Review queue', href: '/statements?filter=needs_review', icon: ListChecks },
  { key: 'export' as const, label: 'Export', href: '/reports', icon: Download },
];

interface QuickActionsBarProps {
  reviewCount?: number;
}

export function QuickActionsBar({ reviewCount }: QuickActionsBarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {staticActions.map(action => {
        const label =
          action.key === 'review'
            ? reviewCount !== undefined
              ? `${action.baseLabel} (${reviewCount})`
              : action.baseLabel
            : action.label;

        return (
          <Link key={action.key} href={action.href}>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary hover:bg-primary/5 shadow-sm text-xs h-8"
            >
              <action.icon className="h-3.5 w-3.5" />
              {label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}
