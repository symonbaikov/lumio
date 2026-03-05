'use client';

import { type SidePanelPageConfig, useSidePanelConfig } from '@/app/components/side-panel';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { type WorkspaceTabId, getWorkspaceTabItems } from '@/app/lib/workspace-tabs';
import { Building2, FolderOpen, LayoutGrid, Users } from 'lucide-react';
import { useMemo } from 'react';

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
      sections: [
        {
          id: 'workspace-tabs',
          type: 'navigation',
          className: 'rounded-2xl border border-gray-100 bg-white px-1 pt-1',
          items: tabItems.map(item => ({
            ...item,
            icon: item.id === 'overview' ? Building2 : item.id === 'members' ? Users : FolderOpen,
          })),
        },
        {
          id: 'workspace-navigation',
          type: 'navigation',
          title: 'Navigation',
          titleClassName: 'text-[13px] font-medium text-gray-400 dark:text-gray-500',
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
  }, [activeItem, currentWorkspace?.stats?.memberCount, isAllWorkspacesOpen, onOpenAllWorkspaces]);

  useSidePanelConfig({ config: sidePanelConfig, autoRegister: true });

  return null;
}
