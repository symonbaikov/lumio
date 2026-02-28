'use client';

import { Button } from '@/app/components/ui/button';
import { FileUp, PenLine, Plus } from 'lucide-react';
import Link from 'next/link';

const actions = [
  {
    key: 'upload',
    label: 'Upload document',
    href: '/statements/submit',
    icon: FileUp,
  },
  {
    key: 'payment',
    label: 'Create payment',
    href: '/statements/pay',
    icon: Plus,
  },
  {
    key: 'expense',
    label: 'Add manual expense',
    href: '/data-entry',
    icon: PenLine,
  },
] as const;

type ActionKey = (typeof actions)[number]['key'];

interface QuickActionsProps {
  allowed?: ActionKey[];
  labels: Record<ActionKey, string>;
}

export function QuickActions({ allowed, labels }: QuickActionsProps) {
  const visibleActions = allowed ? actions.filter(action => allowed.includes(action.key)) : actions;

  return (
    <div className="flex flex-wrap gap-2">
      {visibleActions.map(action => (
        <Link key={action.href} href={action.href}>
          <Button
            variant="outline"
            className="gap-2 rounded-full border-primary/30 text-primary hover:border-primary hover:bg-primary/5"
          >
            <action.icon className="h-4 w-4" />
            {labels[action.key]}
          </Button>
        </Link>
      ))}
    </div>
  );
}
