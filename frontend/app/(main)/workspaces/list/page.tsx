'use client';

import { createBasicSidePanelConfig, useSidePanelConfig } from '@/app/components/side-panel';
import { useMemo } from 'react';
import WorkspacesListContent from '../components/WorkspacesListContent';

export default function WorkspacesListPage() {
  const sidePanelConfig = useMemo(
    () =>
      createBasicSidePanelConfig({
        pageId: 'workspaces-list',
        title: 'Workspaces',
        subtitle: 'All workspaces',
      }),
    [],
  );

  useSidePanelConfig({ config: sidePanelConfig, autoRegister: true });

  return <WorkspacesListContent />;
}
