'use client';

import { ChevronRight, MoreVertical, Plus } from '@/app/components/icons';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import React from 'react';

type WorkspaceItem = { id: string; name: string; memberRole?: string };

const GRID_COLS = 'minmax(240px, 1.4fr) minmax(180px, 1fr) minmax(160px, 0.8fr) auto';

type ListRowProps = { workspace: WorkspaceItem; isDefault: boolean; onClick: () => void };
function WorkspaceListRow({ workspace, isDefault, onClick }: ListRowProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: GRID_COLS,
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '16px 24px',
        textAlign: 'left',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
      }}
    >
      <Box sx={{ display: 'flex', minWidth: 0, alignItems: 'center' }}>
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--foreground)',
          }}
        >
          {workspace.name}
        </span>
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--foreground)',
          }}
        >
          You
        </p>
        <p
          style={{
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 12,
            color: 'var(--muted-foreground)',
          }}
        >
          Current member
        </p>
      </Box>
      <Box>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>
          {workspace.memberRole || 'Workspace'}
        </p>
        {isDefault && (
          <Box
            component="span"
            sx={theme => ({
              display: 'inline-flex',
              mt: 0.5,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              px: 1,
              py: '2px',
              fontSize: 12,
              fontWeight: 600,
              color: 'primary.dark',
              borderRadius: `${tokens.radius.sm}px`,
            })}
          >
            Default
          </Box>
        )}
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 1,
          color: 'var(--muted-foreground)',
        }}
      >
        <MoreVertical size={18} />
        <ChevronRight size={18} />
      </Box>
    </button>
  );
}

type WorkspaceListViewProps = {
  workspaces: WorkspaceItem[];
  currentWorkspaceId: string | undefined;
  createLabel: string;
  onWorkspaceClick: (id: string) => void;
  onCreateClick: () => void;
};
export function WorkspaceListView({
  workspaces,
  currentWorkspaceId,
  createLabel,
  onWorkspaceClick,
  onCreateClick,
}: WorkspaceListViewProps): React.JSX.Element {
  return (
    <>
      <Box
        sx={{
          mb: 4,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          borderRadius: tokens.radius.lg,
          bgcolor: 'var(--card)',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: GRID_COLS,
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            bgcolor: 'var(--muted)',
            px: 3,
            py: 1.5,
            fontSize: 14,
            color: 'var(--muted-foreground)',
          }}
        >
          <span>Workspace name</span>
          <span>Owner</span>
          <span>Workspace type</span>
          <span className="sr-only">Actions</span>
        </Box>
        <Box>
          {workspaces.map(workspace => (
            <WorkspaceListRow
              key={workspace.id}
              workspace={workspace}
              isDefault={currentWorkspaceId === workspace.id}
              onClick={() => onWorkspaceClick(workspace.id)}
            />
          ))}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={onCreateClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            background: 'var(--primary)',
            color: '#fff',
            fontWeight: 500,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
            borderRadius: tokens.radius.md,
          }}
        >
          <Plus size={14} />
          {createLabel}
        </button>
      </Box>
    </>
  );
}
