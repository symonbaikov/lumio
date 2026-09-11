'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React, { type ComponentType, Suspense, useEffect } from 'react';
import { Alert } from '@/app/components/ui/alert';
import { useAuth } from '@/app/hooks/useAuth';
import { settingsSectionDomId } from '@/app/settings/profile/components/SettingsAccordion';
import { SettingsSkeleton } from '@/app/settings/profile/components/SettingsSkeleton';
import {
  SettingsTabs,
  type SettingsTabsLabels,
} from '@/app/settings/profile/components/SettingsTabs';
import type { SettingsTabId } from '@/app/settings/profile/helpers/settings-url-state';
import { useSettingsText } from '@/app/settings/profile/hooks/useSettingsText';
import { useSettingsUrlState } from '@/app/settings/profile/hooks/useSettingsUrlState';
import { AdvancedTab } from '@/app/settings/profile/tabs/AdvancedTab';
import { DataTab } from '@/app/settings/profile/tabs/DataTab';
import { GeneralTab } from '@/app/settings/profile/tabs/GeneralTab';
import { NotificationsTab } from '@/app/settings/profile/tabs/NotificationsTab';
import { SecurityTab } from '@/app/settings/profile/tabs/SecurityTab';
import type { SettingsTabProps } from '@/app/settings/profile/tabs/types';

const TAB_COMPONENT: Record<SettingsTabId, ComponentType<SettingsTabProps>> = {
  general: GeneralTab,
  security: SecurityTab,
  notifications: NotificationsTab,
  data: DataTab,
  advanced: AdvancedTab,
};

function ProfileSettingsPageInner(): React.JSX.Element {
  const { user, loading, setUser, logout } = useAuth();
  const { t, tx } = useSettingsText();
  const { activeTab, section, setActiveTab } = useSettingsUrlState();

  // A deep link names a panel further down the tab; bring it into view once it exists.
  useEffect(() => {
    if (!section || loading || !user) return;
    document
      .getElementById(settingsSectionDomId(section))
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [section, loading, user]);

  if (loading) {
    return <SettingsSkeleton />;
  }

  if (!user) {
    return (
      <Box className="container-shared" sx={{ px: 2, py: 5 }}>
        <Alert style={{ maxWidth: 576 }} variant="default">
          {t.authRequired.value}
        </Alert>
      </Box>
    );
  }

  const labels: SettingsTabsLabels = {
    general: tx(['tabs', 'general'], 'General'),
    security: tx(['tabs', 'security'], 'Security'),
    notifications: tx(['tabs', 'notifications'], 'Notifications'),
    data: tx(['tabs', 'data'], 'Data'),
    advanced: tx(['tabs', 'advanced'], 'Advanced'),
  };
  const ActiveTab = TAB_COMPONENT[activeTab];

  return (
    <Box className="container-shared" sx={{ px: 2, py: 4 }}>
      <Box>
        <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} labels={labels} />
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 2 }}>
          {labels[activeTab]}
        </Typography>
        <ActiveTab section={section} user={user} setUser={setUser} logout={logout} />
      </Box>
    </Box>
  );
}

/** `useSearchParams` needs a Suspense boundary so the static shell can prerender. */
export default function ProfileSettingsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <ProfileSettingsPageInner />
    </Suspense>
  );
}
