'use client';

import WorkspaceOverviewView from '../components/WorkspaceOverviewView';
import WorkspaceTabShell from '../components/WorkspaceTabShell';

export default function WorkspaceOverviewPage() {
  return (
    <WorkspaceTabShell activeItem="overview">
      <WorkspaceOverviewView />
    </WorkspaceTabShell>
  );
}
