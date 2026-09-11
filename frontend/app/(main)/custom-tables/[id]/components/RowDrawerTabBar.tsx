'use client';

import { Box } from '@mui/material';
import React from 'react';

type Tab = 'details' | 'history';

interface RowDrawerTabBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

function tabSx(active: boolean): object {
  return {
    px: 1.5,
    py: 0.5,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    bgcolor: active ? 'var(--foreground)' : 'transparent',
    color: active ? 'var(--background)' : 'var(--text-secondary)',
  };
}

export function RowDrawerTabBar({
  activeTab,
  onTabChange,
}: RowDrawerTabBarProps): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        borderBottom: '1px solid var(--border-color)',
        pb: 1,
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={() => onTabChange('details')}
        sx={tabSx(activeTab === 'details')}
      >
        Details
      </Box>
      <Box
        component="button"
        type="button"
        onClick={() => onTabChange('history')}
        sx={tabSx(activeTab === 'history')}
      >
        History
      </Box>
    </Box>
  );
}
