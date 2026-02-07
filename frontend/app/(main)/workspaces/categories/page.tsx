'use client';

import WorkspaceCategoriesView from '../components/WorkspaceCategoriesView';
import WorkspaceTabShell from '../components/WorkspaceTabShell';

export default function WorkspaceCategoriesPage() {
  return (
    <WorkspaceTabShell activeItem="categories">
      <WorkspaceCategoriesView />
    </WorkspaceTabShell>
  );
}
