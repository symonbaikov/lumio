'use client';

import { useCallback, useState } from 'react';
import { Cpu } from '@/app/components/icons';
import { usePluginState } from '../hooks/usePluginState';
import { useApiKeys } from './useApiKeys';
import { McpServerDrawer } from './McpServerDrawer';

export function McpServerTopBarButton() {
  const { isEnabled } = usePluginState();
  const { isActive } = useApiKeys();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleOpen = useCallback(() => setDrawerOpen(true), []);
  const handleClose = useCallback(() => setDrawerOpen(false), []);

  if (!isEnabled('mcp-server')) return null;

  return (
    <>
      <button
        type="button"
        className="lumio-topbar__icon-btn"
        title="MCP Server"
        onClick={handleOpen}
        style={{ position: 'relative' }}
      >
        <Cpu size={18} />
        <span
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isActive ? '#059669' : '#dc2626',
            border: '1.5px solid var(--background, #fff)',
          }}
        />
      </button>
      <McpServerDrawer isOpen={drawerOpen} onClose={handleClose} />
    </>
  );
}
