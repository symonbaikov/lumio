'use client';

import { useNotifications as useNotificationContext } from '@/app/contexts/NotificationContext';

export function useNotifications() {
  return useNotificationContext();
}
