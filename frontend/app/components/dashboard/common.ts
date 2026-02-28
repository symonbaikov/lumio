export const priorityTone: Record<
  'critical' | 'warning' | 'info' | 'success',
  { bg: string; text: string; ring: string; dot: string }
> = {
  critical: {
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-200',
    ring: 'ring-rose-100 dark:ring-rose-500/30',
    dot: 'bg-rose-500',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-800 dark:text-amber-100',
    ring: 'ring-amber-100 dark:ring-amber-500/30',
    dot: 'bg-amber-500',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-800 dark:text-blue-100',
    ring: 'ring-blue-100 dark:ring-blue-500/30',
    dot: 'bg-blue-500',
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-800 dark:text-emerald-100',
    ring: 'ring-emerald-100 dark:ring-emerald-500/30',
    dot: 'bg-emerald-500',
  },
};

export const cardShell =
  'rounded-xl border border-[var(--ff-dashboard-card-border)] bg-[var(--ff-dashboard-card)] text-[var(--ff-dashboard-card-foreground)] shadow-sm';

export const subtleBadge =
  'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold';
