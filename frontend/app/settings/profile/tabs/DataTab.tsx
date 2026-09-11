'use client';

import Stack from '@mui/material/Stack';
import type React from 'react';
import { Cloud, Shield, SlidersHorizontal } from '@/app/components/icons';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { MyDataSection } from '@/app/settings/profile/components/MyDataSection';
import { ProcessingSection } from '@/app/settings/profile/components/ProcessingSection';
import { SettingsAccordion } from '@/app/settings/profile/components/SettingsAccordion';
import { SyncSection } from '@/app/settings/profile/components/SyncSection';
import { resolveOpenSection } from '@/app/settings/profile/helpers/settings-url-state';
import { useProcessing } from '@/app/settings/profile/hooks/useProcessing';
import { useSettingsText } from '@/app/settings/profile/hooks/useSettingsText';
import { useSync } from '@/app/settings/profile/hooks/useSync';

import type { SettingsTabProps } from './types';

export function DataTab({ section, user, logout }: SettingsTabProps): React.JSX.Element {
  const { currentWorkspace } = useWorkspace();
  const { tx } = useSettingsText();
  const openSection = resolveOpenSection('data', section);

  const processing = useProcessing(!!user, currentWorkspace?.id, {
    loadError: tx(['processingCard', 'loadError'], 'Failed to load processing settings'),
    saveError: tx(['processingCard', 'saveError'], 'Failed to save processing settings'),
    savedMessage: tx(['notificationsCard', 'messages', 'saved'], 'Saved'),
  });

  const {
    bankStats,
    totalCount,
    statsLoading,
    downloading,
    errorMessage: syncError,
    handleExportZip,
  } = useSync();

  // The account is gone; clear the client session rather than leaving a dead token around.
  const handleAccountDeleted = (): void => {
    void logout();
  };

  return (
    <Stack spacing={2}>
      <SettingsAccordion
        id="processing"
        title={tx(['processingCard', 'title'], 'Processing')}
        description={tx(['processingCard', 'description'], '')}
        icon={SlidersHorizontal}
        defaultExpanded={openSection === 'processing'}
      >
        <ProcessingSection tx={tx} processing={processing} />
      </SettingsAccordion>

      <SettingsAccordion
        id="sync"
        title={tx(['syncCard', 'title'], 'Sync & backup')}
        description={tx(['syncCard', 'description'], 'Export and sync files to your filesystem')}
        icon={Cloud}
        defaultExpanded={openSection === 'sync'}
      >
        <SyncSection
          bankStats={bankStats}
          totalCount={totalCount}
          statsLoading={statsLoading}
          downloading={downloading}
          errorMessage={syncError}
          handleExportZip={handleExportZip}
        />
      </SettingsAccordion>

      <SettingsAccordion
        id="my-data"
        title={tx(['myDataCard', 'title'], 'My data')}
        description={tx(
          ['myDataCard', 'description'],
          'Download a copy of your data, or delete your account',
        )}
        icon={Shield}
        defaultExpanded={openSection === 'my-data'}
      >
        <MyDataSection tx={tx} onAccountDeleted={handleAccountDeleted} />
      </SettingsAccordion>
    </Stack>
  );
}
