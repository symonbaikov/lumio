'use client';

import { Plus } from '@/app/components/icons';
import { EmptyStateIllustration } from '@/app/components/ui/EmptyStateIllustration';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';
import { WorkspaceCard } from './WorkspaceCard';

type WorkspaceItem = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  backgroundImage: string | null;
  isFavorite: boolean;
  memberRole?: string;
};

type EmptyStateProps = {
  createLabel: string;
  noWorkspacesLabel: string;
  onCreateClick: () => void;
};
function EmptyWorkspacesState({
  createLabel,
  noWorkspacesLabel,
  onCreateClick,
}: EmptyStateProps): React.JSX.Element {
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <EmptyStateIllustration name="workspaces" size="lg" />
      <Typography variant="h6" fontWeight={600} sx={{ mb: 1, color: 'var(--foreground)' }}>
        {noWorkspacesLabel}
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'var(--text-secondary)' }}>
        Create your first workspace to get started
      </Typography>
      <button
        type="button"
        onClick={onCreateClick}
        style={{
          padding: '12px 24px',
          background: 'var(--primary-fill)',
          color: '#fff',
          fontWeight: 500,
          fontSize: 14,
          border: 'none',
          cursor: 'pointer',
          borderRadius: tokens.radius.md,
        }}
      >
        {createLabel}
      </button>
    </Box>
  );
}

function NoResultsState(): React.JSX.Element {
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <EmptyStateIllustration name="no-results" size="md" />
      <Typography variant="h6" fontWeight={600} sx={{ mb: 1, color: 'var(--foreground)' }}>
        No workspaces found
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'var(--text-secondary)' }}>
        Try adjusting your search query
      </Typography>
    </Box>
  );
}

type WorkspaceGridViewProps = {
  workspaces: WorkspaceItem[];
  allWorkspacesEmpty: boolean;
  filteredEmpty: boolean;
  createLabel: string;
  noWorkspacesLabel: string;
  onWorkspaceClick: (id: string) => void;
  onCreateClick: () => void;
  onFavoriteToggle: (id: string) => Promise<void>;
};

export function WorkspaceGridView({
  workspaces,
  allWorkspacesEmpty,
  filteredEmpty,
  createLabel,
  noWorkspacesLabel,
  onWorkspaceClick,
  onCreateClick,
  onFavoriteToggle,
}: WorkspaceGridViewProps): React.JSX.Element {
  if (allWorkspacesEmpty) {
    return (
      <EmptyWorkspacesState
        createLabel={createLabel}
        noWorkspacesLabel={noWorkspacesLabel}
        onCreateClick={onCreateClick}
      />
    );
  }
  if (filteredEmpty) {
    return <NoResultsState />;
  }
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          lg: 'repeat(3, 1fr)',
          xl: 'repeat(4, 1fr)',
        },
        gap: 3,
        mb: 4,
      }}
    >
      {workspaces.map(workspace => (
        <WorkspaceCard
          key={workspace.id}
          workspace={workspace}
          onClick={() => onWorkspaceClick(workspace.id)}
          onFavoriteToggle={onFavoriteToggle}
        />
      ))}
      <button
        type="button"
        onClick={onCreateClick}
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          aspectRatio: '16/9',
          cursor: 'pointer',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-color)',
          background: 'var(--card-bg)',
          padding: 24,
          borderRadius: tokens.radius.xl,
          transition: 'border-color 0.2s',
        }}
      >
        <Plus size={30} strokeWidth={2.25} style={{ marginBottom: 12, color: 'var(--primary)' }} />
        <Typography
          variant="h6"
          fontWeight={600}
          style={{ textAlign: 'center', color: 'var(--foreground)' }}
        >
          {createLabel}
        </Typography>
      </button>
    </Box>
  );
}
