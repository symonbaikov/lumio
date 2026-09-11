'use client';

import { Box, IconButton, Typography } from '@mui/material';
import React from 'react';
import { X } from '@/app/components/icons';
import { tokens } from '@/lib/theme-tokens';
import { StorageFoldersSidebar, type StorageFoldersSidebarProps } from './StorageFoldersSidebar';
import { StorageTagsPanel, type StorageTagsPanelProps } from './StorageTagsPanel';

type SidebarProps = Omit<StorageFoldersSidebarProps, never>;
type TagsPanelProps = Omit<StorageTagsPanelProps, never>;

export interface StorageFolderModalProps {
  modalTitle: React.ReactNode;
  modalSubtitle: React.ReactNode;
  sidebarProps: SidebarProps;
  tagsPanelProps: TagsPanelProps;
  onClose: () => void;
}

export function StorageFolderModal({
  modalTitle,
  modalSubtitle,
  sidebarProps,
  tagsPanelProps,
  onClose,
}: StorageFolderModalProps): React.JSX.Element {
  return (
    <>
      <Box
        sx={{ position: 'fixed', inset: 0, zIndex: 70, bgcolor: 'rgba(0,0,0,0.3)' }}
        role="button"
        tabIndex={0}
        onClick={onClose}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            width: '100%',
            maxWidth: 1380,
            minHeight: '70vh',
            maxHeight: '90vh',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            bgcolor: 'background.paper',
          }}
        >
          <ModalHeader title={modalTitle} subtitle={modalSubtitle} onClose={onClose} />
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <StorageFoldersSidebar {...sidebarProps} />
            <Box
              sx={{
                borderLeft: '1px solid var(--muted)',
                p: 2,
                width: 320,
                flexShrink: 0,
                overflowY: 'auto',
              }}
            >
              <StorageTagsPanel {...tagsPanelProps} />
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}

interface ModalHeaderProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  onClose: () => void;
}

function ModalHeader({ title, subtitle, onClose }: ModalHeaderProps): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--muted)',
        px: 3,
        py: 2,
      }}
    >
      <Box>
        <Typography style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>
          {title}
        </Typography>
        <Typography style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
          {subtitle}
        </Typography>
      </Box>
      <IconButton size="small" onClick={onClose} sx={{ borderRadius: tokens.radius.sm }}>
        <X size={18} />
      </IconButton>
    </Box>
  );
}
