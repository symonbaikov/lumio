'use client';

import type React from 'react';
import { useState } from 'react';
import { useIntlayer } from '@/app/i18n';
import { Box, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import WebhookIcon from '@mui/icons-material/Webhook';
import { Puzzle } from '@/app/components/icons';
import { PluginCard } from './components/PluginCard';
import { usePluginState } from './hooks/usePluginState';
import { WebhooksDrawer } from './webhooks/WebhooksDrawer';

export default function PluginsPage(): React.JSX.Element {
  const t = useIntlayer('pluginsPage');
  const { isEnabled, toggle } = usePluginState();
  const [webhooksOpen, setWebhooksOpen] = useState(false);

  const plugins = [
    {
      key: 'ai-assistant' as const,
      name: t.cards.aiAssistant.name,
      description: t.cards.aiAssistant.description,
      icon: <SmartToyIcon sx={{ fontSize: 22 }} />,
    },
    {
      key: 'webhooks' as const,
      name: 'Webhooks',
      description: 'Connect external tools via inbound webhooks for uploads and outbound notifications for events.',
      icon: <WebhookIcon sx={{ fontSize: 22 }} />,
      onConfigure: () => setWebhooksOpen(true),
    },
  ];

  const enabled = plugins.filter(p => isEnabled(p.key));
  const available = plugins.filter(p => !isEnabled(p.key));

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', py: 4, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Puzzle size={24} style={{ color: 'var(--primary)' }} />
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
          {t.title}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 14, color: 'var(--text-secondary)', mb: 4 }}>
        {t.subtitle}
      </Typography>

      {/* Enabled section */}
      {enabled.length > 0 && (
        <>
          <Typography sx={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: 0.5, mb: 1.5 }}>
            {t.sections.enabled}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 2,
              mb: 4,
            }}
          >
            {enabled.map(p => (
              <PluginCard
                key={p.key}
                icon={p.icon}
                name={p.name}
                description={p.description}
                enabled
                enableLabel={t.enable}
                disableLabel={t.disable}
                onToggle={() => toggle(p.key)}
                onConfigure={'onConfigure' in p ? p.onConfigure : undefined}
              />
            ))}
          </Box>
        </>
      )}

      {/* Available section */}
      {available.length > 0 && (
        <>
          <Typography sx={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: 0.5, mb: 1.5 }}>
            {t.sections.available}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            {available.map(p => (
              <PluginCard
                key={p.key}
                icon={p.icon}
                name={p.name}
                description={p.description}
                enabled={false}
                enableLabel={t.enable}
                disableLabel={t.disable}
                onToggle={() => toggle(p.key)}
              />
            ))}
          </Box>
        </>
      )}
      <WebhooksDrawer isOpen={webhooksOpen} onClose={() => setWebhooksOpen(false)} />
    </Box>
  );
}
