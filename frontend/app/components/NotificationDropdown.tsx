'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Spinner } from '@/app/components/ui/spinner';
import { useNotifications } from '@/app/hooks/useNotifications';
import { useIntlayer, useLocale } from '@/app/i18n';
import { cn } from '@/app/lib/utils';
import { NotificationsNone } from '@mui/icons-material';
import { AlertTriangle, CircleAlert, Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type NotificationDropdownProps = {
  triggerClassName?: string;
  iconSize?: number;
  align?: 'start' | 'end';
};

function formatRelativeTime(value: string, locale: string, justNowLabel: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return justNowLabel;

  const relativeTime = new Intl.RelativeTimeFormat(locale === 'kk' ? 'kk-KZ' : locale, {
    numeric: 'auto',
  });

  if (minutes < 60) return relativeTime.format(-minutes, 'minute');

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return relativeTime.format(-hours, 'hour');

  const days = Math.floor(hours / 24);
  if (days < 7) return relativeTime.format(-days, 'day');

  return date.toLocaleDateString(locale === 'kk' ? 'kk-KZ' : locale);
}

export function NotificationDropdown({
  triggerClassName,
  iconSize = 20,
  align = 'end',
}: NotificationDropdownProps) {
  const t = useIntlayer('notificationDropdown');
  const { locale } = useLocale();
  const { notifications, unreadCount, loading, refresh, markAsRead, markAllAsRead } =
    useNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const getNotificationHref = (notification: {
    type: string;
    entityType: string | null;
    entityId: string | null;
    meta: Record<string, unknown> | null;
  }): string | null => {
    if (notification.type === 'receipt.uncategorized' && notification.entityId) {
      return `/storage/gmail-receipts/${notification.entityId}`;
    }

    if (
      [
        'transaction.uncategorized',
        'parsing.error',
        'import.failed',
        'statement.uploaded',
        'import.committed',
      ].includes(notification.type) &&
      notification.entityId
    ) {
      return `/statements/${notification.entityId}/edit`;
    }

    if (notification.entityType === 'statement' && notification.entityId) {
      return `/statements/${notification.entityId}/edit`;
    }

    if (notification.entityType === 'receipt' && notification.entityId) {
      return `/statements`;
    }

    if (notification.entityType === 'category') {
      return '/workspaces/categories';
    }

    if (notification.entityType === 'workspace') {
      return '/workspaces/overview';
    }

    if (notification.entityType === 'transaction') {
      const statementId =
        typeof notification.meta?.statementId === 'string' ? notification.meta.statementId : null;
      if (statementId) {
        return `/statements/${statementId}/edit`;
      }
      return '/statements';
    }

    return null;
  };

  useEffect(() => {
    if (open) {
      void refresh();
    }
  }, [open, refresh]);

  const unreadLabel = useMemo(() => {
    if (unreadCount > 99) return '99+';
    return String(unreadCount);
  }, [unreadCount]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'relative h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors',
            triggerClassName,
          )}
          title={t.aria.notifications.value}
          aria-label={t.aria.notifications.value}
        >
          <NotificationsNone sx={{ fontSize: iconSize }} />
          {loading ? (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-[#ff4d4f] text-white text-[11px] font-bold leading-none flex items-center justify-center border-2 border-[#1a2130]">
              <Spinner className="size-3 text-white" />
            </span>
          ) : unreadCount > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-[#ff4d4f] text-white text-[11px] font-bold leading-none flex items-center justify-center border-2 border-[#1a2130]">
              {unreadLabel}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="text-sm font-semibold text-foreground">{t.title.value}</div>
          <button
            type="button"
            className="text-xs text-primary hover:opacity-80 disabled:text-muted-foreground"
            onClick={() => void markAllAsRead()}
            disabled={unreadCount === 0}
          >
            {t.markAllRead.value}
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
              {t.loading.value}
            </div>
          ) : null}

          {!loading && notifications.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
              {t.empty.value}
            </div>
          ) : null}

          {notifications.map(notification => {
            const href = getNotificationHref(notification);
            const severityIcon =
              notification.severity === 'error' ? (
                <CircleAlert size={14} className="text-red-500" />
              ) : notification.severity === 'warn' ? (
                <AlertTriangle size={14} className="text-amber-500" />
              ) : (
                <Info size={14} className="text-primary" />
              );

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => {
                  if (!notification.isRead) {
                    void markAsRead([notification.id]);
                  }

                  if (href) {
                    setOpen(false);
                    router.push(href);
                  }
                }}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-border/70 hover:bg-muted/70 transition-colors',
                  !notification.isRead && 'bg-primary/5',
                  href && 'cursor-pointer',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{severityIcon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {notification.title}
                      </p>
                      {!notification.isRead ? (
                        <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatRelativeTime(notification.createdAt, locale, t.justNow.value)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <Link
            href="/settings/notifications"
            className="text-xs text-primary hover:opacity-80"
            onClick={() => setOpen(false)}
          >
            {t.settingsLink.value}
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
