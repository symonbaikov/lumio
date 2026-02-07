'use client';

import WorkspaceMembersView from '../components/WorkspaceMembersView';
import WorkspaceTabShell from '../components/WorkspaceTabShell';

export default function WorkspaceMembersPage() {
  return (
    <WorkspaceTabShell activeItem="members">
      <WorkspaceMembersView />
    </WorkspaceTabShell>
  );
}
