'use client';

import { useCallback, useState } from 'react';
import { Cpu } from '@/app/components/icons';
import { useIntlayer } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import { usePluginState } from '../hooks/usePluginState';
import { McpServerDrawer } from './McpServerDrawer';
import { useApiKeys } from './useApiKeys';

export function McpServerTopBarButton() {
  const { isEnabled } = usePluginState();
  const { isActive } = useApiKeys();
  const t = useIntlayer('mcpServerDrawer');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleOpen = useCallback(() => setDrawerOpen(true), []);
  const handleClose = useCallback(() => setDrawerOpen(false), []);

  if (!isEnabled('mcp-server')) return null;

  return (
    <>
      <button
        type="button"
        className="lumio-topbar__icon-btn"
        title={t.title.value}
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
            borderRadius: tokens.radius.full,
            background: isActive ? tokens.color.success : tokens.color.danger,
            border: '1.5px solid var(--background, #fff)',
          }}
        />
      </button>
      <McpServerDrawer isOpen={drawerOpen} onClose={handleClose} />
    </>
  );
}
