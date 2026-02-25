'use client';

import apiClient from '@/app/lib/api';
import {
  connectNotificationsSocket,
  disconnectNotificationsSocket,
  getNotificationsSocket,
} from '@/app/lib/socket';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useWorkspace } from './WorkspaceContext';

export interface NotificationItem {
  id: string;
  recipientId: string;
  workspaceId: string | null;
  type: string;
  category: string;
  severity: 'info' | 'warn' | 'error';
  title: string;
  message: string;
  isRead: boolean;
  actorId: string | null;
  actorName: string | null;
  entityType: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

type NotificationContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { currentWorkspace } = useWorkspace();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const workspaceId = currentWorkspace?.id;

  const refresh = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (workspaceId) {
        params.workspaceId = workspaceId;
      }

      const [listResponse, unreadResponse] = await Promise.all([
        apiClient.get('/notifications', { params }),
        apiClient.get('/notifications/unread-count', { params }),
      ]);

      setNotifications(listResponse.data.items ?? []);
      setUnreadCount(unreadResponse.data.count ?? 0);
    } catch (error) {
      console.error('Failed to load notifications', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      disconnectNotificationsSocket();
      setSocket(null);
      return;
    }

    const existing = getNotificationsSocket();
    const nextSocket = existing ?? connectNotificationsSocket(token);
    setSocket(nextSocket);

    return () => {
      nextSocket.off('notification:new');
    };
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const onNotification = (notification: NotificationItem) => {
      if (workspaceId && notification.workspaceId && notification.workspaceId !== workspaceId) {
        return;
      }

      setNotifications(previous => {
        if (previous.some(item => item.id === notification.id)) {
          return previous;
        }
        return [notification, ...previous].slice(0, 50);
      });

      if (!notification.isRead) {
        setUnreadCount(previous => previous + 1);
      }
    };

    socket.on('notification:new', onNotification);
    return () => {
      socket.off('notification:new', onNotification);
    };
  }, [socket, workspaceId]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    if (workspaceId) {
      socket.emit('join-workspace', { workspaceId });
    }

    return () => {
      if (workspaceId) {
        socket.emit('leave-workspace', { workspaceId });
      }
    };
  }, [socket, workspaceId]);

  const markAsRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      return;
    }

    await apiClient.post('/notifications/mark-read', { ids });
    setNotifications(previous =>
      previous.map(item => (ids.includes(item.id) ? { ...item, isRead: true } : item)),
    );
    setUnreadCount(previous => Math.max(0, previous - ids.length));
  }, []);

  const markAllAsRead = useCallback(async () => {
    const params: Record<string, string> = {};
    if (workspaceId) {
      params.workspaceId = workspaceId;
    }
    await apiClient.post('/notifications/mark-all-read', null, { params });
    setNotifications(previous => previous.map(item => ({ ...item, isRead: true })));
    setUnreadCount(0);
  }, [workspaceId]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      loading,
      refresh,
      markAsRead,
      markAllAsRead,
    }),
    [loading, markAllAsRead, markAsRead, notifications, refresh, unreadCount],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
