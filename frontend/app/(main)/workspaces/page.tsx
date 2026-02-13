'use client';

import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { getWorkspacesRootRedirectPath } from '@/app/lib/workspace-tabs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function WorkspacesPage() {
  const router = useRouter();
  const { currentWorkspace, loading } = useWorkspace();

  useEffect(() => {
    if (loading) return;
    router.replace(getWorkspacesRootRedirectPath(Boolean(currentWorkspace)));
  }, [currentWorkspace, loading, router]);

  return null;
}
