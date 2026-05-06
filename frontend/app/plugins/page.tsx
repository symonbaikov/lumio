'use client';

import { Cpu, Search } from '@/app/components/icons';
import { useIntlayer } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import WebhookIcon from '@mui/icons-material/Webhook';
import { Box, Stack, Typography } from '@mui/material';
import type React from 'react';
import { isValidElement } from 'react';
import { useMemo, useState } from 'react';
import {
  CategoryDivider,
  IntegrationCard,
  type IntegrationItem,
} from '../integrations/components/IntegrationCard';
import { usePluginState } from './hooks/usePluginState';
import { McpServerDrawer } from './mcp-server/McpServerDrawer';
import { WebhooksDrawer } from './webhooks/WebhooksDrawer';

function toSearchText(value: React.ReactNode): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(toSearchText).join(' ');
  }
  if (isValidElement<{ children?: React.ReactNode }>(value)) {
    return toSearchText(value.props.children);
  }
  return '';
}

export default function PluginsPage(): React.JSX.Element {
  const t = useIntlayer('pluginsPage');
  const { isEnabled, toggle } = usePluginState();
  const [searchQuery, setSearchQuery] = useState('');
  const [webhooksOpen, setWebhooksOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);

  const plugins = [
    {
      key: 'ai-assistant' as const,
      name: t.cards.aiAssistant.name,
      description: t.cards.aiAssistant.description,
      icon: <SmartToyIcon sx={{ fontSize: 22 }} />,
      onConfigure: undefined,
    },
    {
      key: 'webhooks' as const,
      name: 'Webhooks',
      description:
        'Connect external tools via inbound webhooks for uploads and outbound notifications for events.',
      icon: <WebhookIcon sx={{ fontSize: 22 }} />,
      onConfigure: () => setWebhooksOpen(true),
    },
    {
      key: 'mcp-server' as const,
      name: 'MCP Server',
      description:
        'Let AI agents (Claude Code, Hermes, and others) interact with Lumio via the Model Context Protocol.',
      icon: <Cpu size={22} />,
      onConfigure: () => setMcpOpen(true),
    },
  ];

  const pluginItems: IntegrationItem[] = plugins.map(plugin => {
    const active = isEnabled(plugin.key);
    const configureAction = plugin.onConfigure
      ? [{ key: `${plugin.key}-configure`, label: 'Configure', onClick: plugin.onConfigure }]
      : [];

    return {
      key: plugin.key,
      name: plugin.name,
      description: plugin.description,
      badge: active ? 'Active' : 'Available',
      category: 'plugins',
      recommended: false,
      icon: plugin.icon,
      active,
      actions: [
        ...configureAction,
        active
          ? {
              key: `${plugin.key}-disable`,
              label: t.disable,
              onClick: () => toggle(plugin.key),
              destructive: true,
            }
          : {
              key: `${plugin.key}-enable`,
              label: t.enable,
              onClick: () => toggle(plugin.key),
              primary: true,
            },
      ],
    };
  });

  const filteredPlugins = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return pluginItems;
    }

    return pluginItems.filter(item => {
      const searchText = `${toSearchText(item.name)} ${toSearchText(item.description)}`;
      return searchText.toLowerCase().includes(query);
    });
  }, [pluginItems, searchQuery]);

  const enabled = filteredPlugins.filter(plugin => plugin.active);
  const available = filteredPlugins.filter(plugin => !plugin.active);

  const renderGrid = (items: IntegrationItem[]): React.JSX.Element => (
    <Stack spacing={3}>
      <Box>
        <CategoryDivider label={t.title} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr 1fr',
              lg: '1fr 1fr 1fr',
              xl: '1fr 1fr 1fr 1fr',
            },
            gap: 2,
          }}
        >
          {items.map(item => (
            <IntegrationCard key={item.key} item={item} onCardClick={() => undefined} />
          ))}
        </Box>
      </Box>
    </Stack>
  );

  const renderEmpty = (message: React.ReactNode): React.JSX.Element => (
    <Box
      sx={{
        borderRadius: tokens.radius.lg,
        border: '1px dashed var(--border-color)',
        bgcolor: 'var(--muted)',
        p: 2,
      }}
    >
      <Typography style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{message}</Typography>
    </Box>
  );

  return (
    <Box sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: 5 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
          gap: 3,
          mb: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: tokens.radius.full,
              bgcolor: 'rgba(var(--color-primary-rgb), 0.1)',
              color: 'primary.main',
              display: 'flex',
            }}
          >
            <ExtensionOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />
          </Box>
          <Box>
            <Typography variant="h4" style={{ fontWeight: 700, color: 'var(--foreground)' }}>
              {t.title}
            </Typography>
            <Typography style={{ marginTop: 4, color: 'var(--muted-foreground)' }}>
              {t.subtitle}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ position: 'relative', width: '100%', maxWidth: 448 }}>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 12,
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <Search style={{ height: 16, width: 16, color: 'var(--muted-foreground)' }} />
          </Box>
          <input
            type="text"
            style={{
              display: 'block',
              width: '100%',
              border: '1px solid var(--border-color)',
              borderRadius: tokens.radius.md,
              background: 'var(--card-bg)',
              padding: '8px 16px 8px 40px',
              fontSize: 14,
              color: 'var(--foreground)',
            }}
            placeholder="Search plugins"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
          />
        </Box>
      </Box>

      {!searchQuery && (
        <Box
          sx={{
            mb: 4,
            borderRadius: tokens.radius.lg,
            bgcolor: 'rgba(var(--color-primary-rgb), 0.05)',
            border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
            p: 2,
          }}
        >
          <Typography style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>
            {t.subtitle}
          </Typography>
        </Box>
      )}

      <Stack spacing={4}>
        {(enabled.length > 0 || !searchQuery) && (
          <Box>
            <Typography
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 12,
              }}
            >
              {t.sections.enabled}
            </Typography>
            {enabled.length === 0 ? renderEmpty('No plugins enabled yet.') : renderGrid(enabled)}
          </Box>
        )}

        {(available.length > 0 || !searchQuery) && (
          <Box>
            <Typography
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 12,
              }}
            >
              {t.sections.available}
            </Typography>
            {available.length === 0
              ? renderEmpty('All plugins are enabled.')
              : renderGrid(available)}
          </Box>
        )}

        {searchQuery && filteredPlugins.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 10,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                mb: 2,
                borderRadius: tokens.radius.full,
                bgcolor: 'var(--muted)',
                p: 2,
                display: 'flex',
              }}
            >
              <Search style={{ height: 32, width: 32, color: 'var(--muted-foreground)' }} />
            </Box>
            <Typography style={{ fontSize: 18, fontWeight: 500, color: 'var(--foreground)' }}>
              No plugins found
            </Typography>
            <Typography style={{ color: 'var(--muted-foreground)', marginTop: 4 }}>
              No plugins match "{searchQuery}".
            </Typography>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                marginTop: 16,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-primary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Reset search
            </button>
          </Box>
        )}
      </Stack>
      <WebhooksDrawer isOpen={webhooksOpen} onClose={() => setWebhooksOpen(false)} />
      <McpServerDrawer isOpen={mcpOpen} onClose={() => setMcpOpen(false)} />
    </Box>
  );
}
