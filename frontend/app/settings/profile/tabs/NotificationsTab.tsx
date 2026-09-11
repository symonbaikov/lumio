'use client';

import Stack from '@mui/material/Stack';
import type React from 'react';
import { Bot } from '@/app/components/icons';
import { usePermissions } from '@/app/hooks/usePermissions';
import { useIntlayer } from '@/app/i18n';
import { NotificationsSection } from '@/app/settings/profile/components/NotificationsSection';
import { SettingsAccordion } from '@/app/settings/profile/components/SettingsAccordion';
import { useNotifications } from '@/app/settings/profile/hooks/useNotifications';
import { useSettingsText } from '@/app/settings/profile/hooks/useSettingsText';
import { TelegramSettingsPanel } from '@/app/settings/telegram/TelegramSettingsPanel';

import type { SettingsTabProps } from './types';

export function NotificationsTab({ user }: SettingsTabProps): React.JSX.Element {
  const { hasPermission } = usePermissions();
  const { tx } = useSettingsText();
  const telegramText = useIntlayer('settingsTelegramPage');

  const {
    notificationSettings,
    notificationsLoading,
    notificationSavingKey,
    notificationError,
    notificationMessage,
    toggleNotificationChannel,
    updateDelivery,
  } = useNotifications(!!user, {
    loadError: tx(['notificationsCard', 'errors', 'load'], ''),
    saveError: tx(['notificationsCard', 'errors', 'save'], ''),
    savedMessage: tx(['notificationsCard', 'messages', 'saved'], ''),
  });

  return (
    <Stack spacing={2}>
      <NotificationsSection
        tx={tx}
        notificationError={notificationError}
        notificationMessage={notificationMessage}
        notificationsLoading={notificationsLoading}
        notificationSettings={notificationSettings}
        notificationSavingKey={notificationSavingKey}
        toggleNotificationChannel={toggleNotificationChannel}
        updateDelivery={updateDelivery}
      />

      {hasPermission('telegram.view') ? (
        <SettingsAccordion
          id="telegram"
          title={telegramText.title.value}
          description={telegramText.subtitle.value}
          icon={Bot}
          defaultExpanded
        >
          <TelegramSettingsPanel user={user} />
        </SettingsAccordion>
      ) : null}
    </Stack>
  );
}
