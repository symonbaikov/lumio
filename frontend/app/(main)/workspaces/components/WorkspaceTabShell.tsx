'use client';

import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import type { WorkspaceTabId } from '@/app/lib/workspace-tabs';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { useState } from 'react';
import WorkspaceSidePanel from './WorkspaceSidePanel';
import WorkspacesListContent from './WorkspacesListContent';

type Props = {
  activeItem: WorkspaceTabId;
  children: ReactNode;
};

const BLOCK_SKELETON_KEYS = ['block-0', 'block-1', 'block-2', 'block-3'];

function WorkspaceTabShellSkeleton(): React.JSX.Element {
  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - var(--global-nav-height, 0px))',
        px: 3,
        py: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Skeleton variant="rounded" width={40} height={40} />
        <Box>
          <Skeleton variant="text" width={200} height={28} />
          <Skeleton variant="text" width={280} height={18} />
        </Box>
      </Box>
      {BLOCK_SKELETON_KEYS.map(key => (
        <Skeleton key={key} variant="rounded" height={72} sx={{ borderRadius: tokens.radius.lg }} />
      ))}
    </Box>
  );
}

export default function WorkspaceTabShell({ activeItem, children }: Props) {
  const router = useRouter();
  const { loading, currentWorkspace } = useWorkspace();
  const [isAllWorkspacesOpen, setIsAllWorkspacesOpen] = useState(false);

  useEffect(() => {
    if (!(loading || currentWorkspace)) {
      router.replace('/workspaces/list');
    }
  }, [currentWorkspace, loading, router]);

  if (loading || !currentWorkspace) {
    return <WorkspaceTabShellSkeleton />;
  }

  return (
    <>
      <WorkspaceSidePanel
        activeItem={activeItem}
        isAllWorkspacesOpen={isAllWorkspacesOpen}
        onOpenAllWorkspaces={() => setIsAllWorkspacesOpen(true)}
      />
      {isAllWorkspacesOpen ? (
        <WorkspacesListContent
          embedded
          redirectPathOnSelect={null}
          onWorkspaceActivated={() => setIsAllWorkspacesOpen(false)}
          onCloseEmbedded={() => setIsAllWorkspacesOpen(false)}
        />
      ) : (
        children
      )}
    </>
  );
}
