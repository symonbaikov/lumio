// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationDropdown } from './NotificationDropdown';

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

const notificationMocks = vi.hoisted(() => ({
  markAsRead: vi.fn(),
  refresh: vi.fn(),
}));

const menuMocks = vi.hoisted(() => ({
  lastOpen: false,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerMocks.push }),
}));

vi.mock('@/app/i18n', () => ({
  useIntlayer: () => ({
    aria: { notifications: { value: 'Notifications' } },
    title: { value: 'Notifications' },
    markAllRead: { value: 'Mark all as read' },
    loading: { value: 'Loading' },
    empty: { value: 'Empty' },
    settingsLink: { value: 'Notification settings' },
    justNow: { value: 'just now' },
    notificationTypes: {
      receiptUncategorized: {
        title: { value: 'Receipt without category' },
        message: { value: 'Receipt "{{name}}" has no category' },
        messageFallback: { value: 'Found a receipt without category' },
      },
      transactionUncategorized: {
        title: { value: 'Transactions without category' },
        messageSingular: { value: '{{count}} transaction needs a category' },
        messagePlural: { value: '{{count}} transactions need a category' },
      },
    },
  }),
  useLocale: () => ({ locale: 'en' }),
}));

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material');
  return {
    ...actual,
    Menu: ({ open, children }: { open: boolean; children: React.ReactNode }) => {
      menuMocks.lastOpen = open;
      if (!open) {
        return null;
      }
      return <div data-testid="notification-menu">{children}</div>;
    },
  };
});

vi.mock('@/app/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [
      {
        id: 'notification-1',
        type: 'receipt.uncategorized',
        entityType: 'receipt',
        entityId: 'receipt-1',
        meta: null,
        severity: 'warn',
        title: 'Receipt without category',
        message: 'Receipt "[GitHub] Payment Receipt" has no category',
        createdAt: new Date().toISOString(),
        isRead: false,
      },
      {
        id: 'notification-2',
        type: 'transaction.uncategorized',
        entityType: 'statement',
        entityId: 'statement-1',
        meta: null,
        severity: 'warn',
        title: 'Transactions without category',
        message: '1 transaction needs a category',
        createdAt: new Date().toISOString(),
        isRead: false,
      },
    ],
    unreadCount: 2,
    loading: false,
    refresh: notificationMocks.refresh,
    markAsRead: notificationMocks.markAsRead,
    markAllAsRead: vi.fn(),
  }),
}));

describe('NotificationDropdown', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    routerMocks.push.mockReset();
    notificationMocks.markAsRead.mockReset();
    notificationMocks.refresh.mockReset();
    menuMocks.lastOpen = false;
  });

  it('opens notifications in MUI menu on bell click', async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(<NotificationDropdown />);
    });

    const trigger = container.querySelector('button[aria-label="Notifications"]');
    expect(trigger).toBeTruthy();
    expect(menuMocks.lastOpen).toBe(false);

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(menuMocks.lastOpen).toBe(true);
    expect(document.querySelector('[data-testid="notification-menu"]')).toBeTruthy();
    expect(notificationMocks.refresh).toHaveBeenCalled();
  });

  it('routes to receipt details for uncategorized receipts', async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(<NotificationDropdown />);
    });

    const trigger = container.querySelector('button[aria-label="Notifications"]');
    expect(trigger).toBeTruthy();

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const receiptNotification = Array.from(document.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Receipt without category'),
    );

    expect(receiptNotification).toBeTruthy();

    await act(async () => {
      receiptNotification?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(routerMocks.push).toHaveBeenCalledWith('/storage/gmail-receipts/receipt-1');
  });

  it('routes to statement edit for uncategorized transactions', async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(<NotificationDropdown />);
    });

    const trigger = container.querySelector('button[aria-label="Notifications"]');
    expect(trigger).toBeTruthy();

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const transactionNotification = Array.from(document.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Transactions without category'),
    );

    expect(transactionNotification).toBeTruthy();

    await act(async () => {
      transactionNotification?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(routerMocks.push).toHaveBeenCalledWith('/statements/statement-1/edit');
  });

  it('uses theme-aware menu surfaces instead of hardcoded white backgrounds', async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(<NotificationDropdown />);
    });

    const trigger = container.querySelector('button[aria-label="Notifications"]');
    expect(trigger).toBeTruthy();

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const title = document.querySelector('[data-testid="notification-menu"]')?.textContent;
    expect(title).toContain('Notifications');
    expect(title).toContain('Receipt without category');
    expect(title).toContain('Transactions without category');
    expect(title).toContain('Receipt "[GitHub] Payment Receipt" has no category');
    expect(title).toContain('1 transaction needs a category');
    expect(/[\u0400-\u04FF]/.test(title || '')).toBe(false);

    const whiteSurface = Array.from(document.querySelectorAll('div')).find(node =>
      node.className.includes('bg-white'),
    );

    expect(whiteSurface).toBeUndefined();
    expect(document.querySelector('[data-testid="notification-menu"]')?.textContent).toContain(
      'Notification settings',
    );
  });
});
