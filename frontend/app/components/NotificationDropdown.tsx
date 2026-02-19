'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/lib/utils';
import { useNotifications } from '@/app/hooks/useNotifications';
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

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн назад`;

  return date.toLocaleDateString('ru-RU');
}

export function NotificationDropdown({
  triggerClassName,
  iconSize = 20,
  align = 'end',
}: NotificationDropdownProps) {
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
      return `/storage/gmail-receipts?receiptId=${notification.entityId}`;
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
      return `/storage/gmail-receipts?receiptId=${notification.entityId}`;
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
            'relative h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
            triggerClassName,
          )}
          title="Notifications"
          aria-label="Notifications"
        >
          <NotificationsNone sx={{ fontSize: iconSize }} />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none flex items-center justify-center">
              {unreadLabel}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="text-sm font-semibold text-foreground">Уведомления</div>
          <button
            type="button"
            className="text-xs text-primary hover:opacity-80 disabled:text-muted-foreground"
            onClick={() => void markAllAsRead()}
            disabled={unreadCount === 0}
          >
            Прочитать все
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">Загрузка...</div>
          ) : null}

          {!loading && notifications.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
              Нет новых уведомлений
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
                      <p className="text-sm font-medium text-foreground truncate">{notification.title}</p>
                      {!notification.isRead ? (
                        <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatRelativeTime(notification.createdAt)}
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
            Настройки уведомлений
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
