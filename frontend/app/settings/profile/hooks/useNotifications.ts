'use client';

import apiClient from '@/app/lib/api';
import {
  type NotificationChannel,
  type NotificationDigestMode,
  type NotificationPreferences,
  type NotificationSettings,
  defaultNotificationChannels,
  defaultNotificationSettings,
} from '@/app/settings/profile/profileHelpers';
import { useCallback, useEffect, useState } from 'react';

export type UseNotificationsMessages = {
  loadError: string;
  saveError: string;
  savedMessage: string;
};

export type NotificationSavingKey = keyof NotificationPreferences | 'delivery' | null;

export type UseNotificationsReturn = {
  notificationSettings: NotificationSettings;
  notificationsLoading: boolean;
  notificationSavingKey: NotificationSavingKey;
  notificationError: string | null;
  notificationMessage: string | null;
  toggleNotificationChannel: (
    key: keyof NotificationPreferences,
    channel: NotificationChannel,
    value: boolean,
  ) => Promise<void>;
  updateDelivery: (patch: Partial<Omit<NotificationSettings, 'channels'>>) => Promise<void>;
};

export function useNotifications(
  isAuthenticated: boolean,
  activeSection: string,
  messages: UseNotificationsMessages,
): UseNotificationsReturn {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(
    defaultNotificationSettings,
  );
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationSavingKey, setNotificationSavingKey] = useState<NotificationSavingKey>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || activeSection !== 'notifications') return;

    let active = true;

    const load = async () => {
      setNotificationsLoading(true);
      setNotificationError(null);
      try {
        const response = await apiClient.get('/notifications/preferences');
        if (!active) return;
        const data = response.data || {};
        setNotificationSettings({
          // The API fills the matrix in, but a stale row must not blank out the UI.
          channels: { ...defaultNotificationChannels, ...(data.channels || {}) },
          digestMode: (data.digestMode as NotificationDigestMode) || 'instant',
          quietHoursStart: data.quietHoursStart ?? null,
          quietHoursEnd: data.quietHoursEnd ?? null,
        });
      } catch {
        if (!active) return;
        setNotificationError(messages.loadError);
      } finally {
        if (active) setNotificationsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [activeSection, isAuthenticated, messages.loadError]);

  /** Applies an optimistic change and rolls it back if the request fails. */
  const save = useCallback(
    async (
      savingKey: NotificationSavingKey,
      next: NotificationSettings,
      payload: Record<string, unknown>,
    ) => {
      const previous = notificationSettings;
      setNotificationSavingKey(savingKey);
      setNotificationError(null);
      setNotificationMessage(null);
      setNotificationSettings(next);

      try {
        await apiClient.patch('/notifications/preferences', payload);
        setNotificationMessage(messages.savedMessage);
      } catch {
        setNotificationSettings(previous);
        setNotificationError(messages.saveError);
      } finally {
        setNotificationSavingKey(null);
      }
    },
    [messages.saveError, messages.savedMessage, notificationSettings],
  );

  const toggleNotificationChannel = useCallback(
    (key: keyof NotificationPreferences, channel: NotificationChannel, value: boolean) => {
      const nextSet = { ...notificationSettings.channels[key], [channel]: value };

      return save(
        key,
        {
          ...notificationSettings,
          channels: { ...notificationSettings.channels, [key]: nextSet },
        },
        { channels: { [key]: nextSet } },
      );
    },
    [notificationSettings, save],
  );

  const updateDelivery = useCallback(
    (patch: Partial<Omit<NotificationSettings, 'channels'>>) =>
      save('delivery', { ...notificationSettings, ...patch }, patch),
    [notificationSettings, save],
  );

  return {
    notificationSettings,
    notificationsLoading,
    notificationSavingKey,
    notificationError,
    notificationMessage,
    toggleNotificationChannel,
    updateDelivery,
  };
}
