'use client';

import { Building2, FolderOpen, LayoutGrid, Users } from 'lucide-react';
import { useMemo } from 'react';
import { type SidePanelPageConfig, useSidePanelConfig } from '@/app/components/side-panel';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { getWorkspaceTabItems, type WorkspaceTabId } from '@/app/lib/workspace-tabs';

type Props = {
  activeItem: WorkspaceTabId;
  isAllWorkspacesOpen: boolean;
  onOpenAllWorkspaces: () => void;
};

export default function WorkspaceSidePanel({
  activeItem,
  isAllWorkspacesOpen,
  onOpenAllWorkspaces,
}: Props) {
  const { currentWorkspace } = useWorkspace();

  const sidePanelConfig = useMemo<SidePanelPageConfig>(() => {
    const tabItems = getWorkspaceTabItems(activeItem, currentWorkspace?.stats?.memberCount ?? 0);

    return {
      pageId: 'workspace-tabs',
      header: {
        title: 'Workspace',
        subtitle: currentWorkspace?.name ?? 'Management',
      },
      sections: [
        {
          id: 'workspace-tabs',
          type: 'navigation',
          title: 'Settings',
          items: tabItems.map(item => ({
            ...item,
            icon: item.id === 'overview' ? Building2 : item.id === 'members' ? Users : FolderOpen,
          })),
        },
        {
          id: 'workspace-navigation',
          type: 'navigation',
          title: 'Navigation',
          items: [
            {
              id: 'all-workspaces',
              label: 'All Workspaces',
              onClick: onOpenAllWorkspaces,
              icon: LayoutGrid,
              active: isAllWorkspacesOpen,
            },
          ],
        },
      ],
    };
  }, [
    activeItem,
    currentWorkspace?.name,
    currentWorkspace?.stats?.memberCount,
    isAllWorkspacesOpen,
    onOpenAllWorkspaces,
  ]);

  useSidePanelConfig({ config: sidePanelConfig, autoRegister: true });

  return null;
}
