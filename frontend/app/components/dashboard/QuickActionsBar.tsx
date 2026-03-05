'use client';

import { Button } from '@/app/components/ui/button';
import { Download, FileUp, ListChecks } from 'lucide-react';
import Link from 'next/link';

interface QuickActionsBarProps {
  reviewCount?: number;
}

export function QuickActionsBar({ reviewCount }: QuickActionsBarProps) {
  const actions = [
    { key: 'upload', label: 'Upload / Parse', href: '/statements/submit', icon: FileUp },
    {
      key: 'review',
      label: reviewCount !== undefined ? `Review queue (${reviewCount})` : 'Review queue',
      href: '/statements?filter=needs_review',
      icon: ListChecks,
    },
    { key: 'export', label: 'Export', href: '/reports', icon: Download },
  ] as const;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {actions.map(action => (
        <Link key={action.key} href={action.href}>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary hover:bg-primary/5 shadow-sm text-xs h-8"
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}
