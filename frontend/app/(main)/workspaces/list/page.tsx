'use client';

import { useMemo } from 'react';
import { createBasicSidePanelConfig, useSidePanelConfig } from '@/app/components/side-panel';
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
