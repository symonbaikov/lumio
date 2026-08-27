'use client';
import { formatStoredDate } from '@/app/lib/user-format-store';

import { AlertTriangle, Bell, CircleAlert, Info } from '@/app/components/icons';
import { EmptyStateIllustration } from '@/app/components/ui/EmptyStateIllustration';
import { Spinner } from '@/app/components/ui/spinner';
import { useNotifications } from '@/app/hooks/useNotifications';
import { useIntlayer, useLocale } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import { Divider, Menu } from '@mui/material';
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
  if (minutes < 1) {
    return justNowLabel;
  }

  const relativeTime = new Intl.RelativeTimeFormat(locale === 'kk' ? 'kk-KZ' : locale, {
    numeric: 'auto',
  });

  if (minutes < 60) {
    return relativeTime.format(-minutes, 'minute');
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return relativeTime.format(-hours, 'hour');
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return relativeTime.format(-days, 'day');
  }

  return formatStoredDate(date, locale === 'kk' ? 'kk-KZ' : locale);
}

function replaceTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

function extractReceiptName(message: string): string | null {
  const quoted = message.match(/"([^"]+)"/);
  return quoted?.[1] ?? null;
}

function extractCount(message: string): number | null {
  const match = message.match(/\d+/);
  if (!match) {
    return null;
  }
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function resolveTranslationValue(
  value: string | { value?: string } | undefined,
  fallback: string,
): string {
  return typeof value === 'string' ? value : (value?.value ?? fallback);
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

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
      return '/statements';
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

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const unreadLabel = useMemo(() => {
    if (unreadCount > 99) {
      return '99+';
    }
    return String(unreadCount);
  }, [unreadCount]);

  const receiptUncategorizedTitle = resolveTranslationValue(
    t.notificationTypes?.receiptUncategorized?.title,
    'Receipt without category',
  );
  const receiptUncategorizedMessage = resolveTranslationValue(
    t.notificationTypes?.receiptUncategorized?.message,
    'Receipt "{{name}}" has no category',
  );
  const receiptUncategorizedFallback = resolveTranslationValue(
    t.notificationTypes?.receiptUncategorized?.messageFallback,
    'Found a receipt without category',
  );
  const transactionUncategorizedTitle = resolveTranslationValue(
    t.notificationTypes?.transactionUncategorized?.title,
    'Transactions without category',
  );
  const transactionUncategorizedMessageSingular = resolveTranslationValue(
    t.notificationTypes?.transactionUncategorized?.messageSingular,
    '{{count}} transaction needs a category',
  );
  const transactionUncategorizedMessagePlural = resolveTranslationValue(
    t.notificationTypes?.transactionUncategorized?.messagePlural,
    '{{count}} transactions need a category',
  );

  const getLocalizedNotificationCopy = (notification: {
    type: string;
    title: string;
    message: string;
    meta: Record<string, unknown> | null;
  }) => {
    if (notification.type === 'receipt.uncategorized') {
      const receiptName = extractReceiptName(notification.message);
      return {
        title: receiptUncategorizedTitle,
        message: receiptName
          ? replaceTemplate(receiptUncategorizedMessage, {
              name: receiptName,
            })
          : receiptUncategorizedFallback,
      };
    }

    if (notification.type === 'transaction.uncategorized') {
      const metaCount =
        typeof notification.meta?.count === 'number' ? notification.meta.count : null;
      const count = metaCount ?? extractCount(notification.message) ?? 0;

      return {
        title: transactionUncategorizedTitle,
        message: replaceTemplate(
          count === 1
            ? transactionUncategorizedMessageSingular
            : transactionUncategorizedMessagePlural,
          { count },
        ),
      };
    }

    return {
      title: notification.title,
      message: notification.message,
    };
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`lumio-notification-dropdown__trigger${triggerClassName ? ` ${triggerClassName}` : ''}`}
        title={t.aria.notifications.value}
        aria-label={t.aria.notifications.value}
      >
        <Bell size={iconSize} />
        {loading ? (
          <span className="lumio-notification-dropdown__badge">
            <Spinner size={12} sx={{ color: 'white' }} />
          </span>
        ) : unreadCount > 0 ? (
          <span className="lumio-notification-dropdown__badge">{unreadLabel}</span>
        ) : null}
      </button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: align === 'start' ? 'left' : 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: align === 'start' ? 'left' : 'right' }}
        PaperProps={{
          sx: {
            width: 360,
            mt: 1,
            p: 0,
            overflow: 'hidden',
            borderRadius: tokens.radius.lg,
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--card-bg)',
            color: 'var(--card-foreground)',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.22)',
          },
        }}
        MenuListProps={{ disablePadding: true }}
      >
        <div className="lumio-notification-dropdown__header">
          <div className="lumio-notification-dropdown__title">{t.title.value}</div>
          <button
            type="button"
            className="lumio-notification-dropdown__mark-all"
            onClick={() => void markAllAsRead()}
            disabled={unreadCount === 0}
          >
            {t.markAllRead.value}
          </button>
        </div>

        <div className="lumio-notification-dropdown__list">
          {loading && notifications.length === 0 ? (
            <div className="lumio-notification-dropdown__empty">{t.loading.value}</div>
          ) : null}

          {!loading && notifications.length === 0 ? (
            <div className="lumio-notification-dropdown__empty">
              <EmptyStateIllustration name="notifications" size="sm" />
              {t.empty.value}
            </div>
          ) : null}

          {notifications.map(notification => {
            const href = getNotificationHref(notification);
            const localizedCopy = getLocalizedNotificationCopy(notification);
            const severityIcon =
              notification.severity === 'error' ? (
                <CircleAlert size={14} style={{ color: 'var(--destructive)' }} />
              ) : notification.severity === 'warn' ? (
                <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
              ) : (
                <Info size={14} style={{ color: 'var(--color-primary)' }} />
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
                    handleClose();
                    router.push(href);
                  }
                }}
                className={`lumio-notification-dropdown__item${!notification.isRead ? ' lumio-notification-dropdown__item--unread' : ''}`}
              >
                <div className="lumio-notification-dropdown__item-body">
                  <div className="lumio-notification-dropdown__item-icon">{severityIcon}</div>
                  <div className="lumio-notification-dropdown__item-content">
                    <div className="lumio-notification-dropdown__item-header-row">
                      <p className="lumio-notification-dropdown__item-title">
                        {localizedCopy.title}
                      </p>
                      {!notification.isRead ? (
                        <span className="lumio-notification-dropdown__unread-dot" />
                      ) : null}
                    </div>
                    <p className="lumio-notification-dropdown__item-message">
                      {localizedCopy.message}
                    </p>
                    <p className="lumio-notification-dropdown__item-time">
                      {formatRelativeTime(notification.createdAt, locale, t.justNow.value)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Divider />
        <div className="lumio-notification-dropdown__footer">
          <Link
            href="/settings/notifications"
            className="lumio-notification-dropdown__settings-link"
            onClick={() => handleClose()}
          >
            {t.settingsLink.value}
          </Link>
        </div>
      </Menu>
    </>
  );
}
