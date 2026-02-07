'use client';

import { useEffect, type ReactNode } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import type { WorkspaceTabId } from '@/app/lib/workspace-tabs';
import WorkspaceSidePanel from './WorkspaceSidePanel';
import WorkspacesListContent from './WorkspacesListContent';

type Props = {
  activeItem: WorkspaceTabId;
  children: ReactNode;
};

export default function WorkspaceTabShell({ activeItem, children }: Props) {
  const router = useRouter();
  const { loading, currentWorkspace } = useWorkspace();
  const [isAllWorkspacesOpen, setIsAllWorkspacesOpen] = useState(false);

  useEffect(() => {
    if (!loading && !currentWorkspace) {
      router.replace('/workspaces/list');
    }
  }, [currentWorkspace, loading, router]);

  if (loading || !currentWorkspace) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <LoadingAnimation size="lg" />
      </div>
    );
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
