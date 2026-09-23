'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { Cloud, Shield, UserCircle } from '@/app/components/icons';
import { type AppPanelKey, openAppPanel } from '@/app/components/panels/app-panels-store';
import { tokens } from '@/lib/theme-tokens';

type Tx = (path: string[], fallback: string) => string;

type ElsewhereLink = {
  key: string;
  fallback: string;
  icon: typeof UserCircle;
  /** A route to open, or the panel this entry slides open over the page. */
  href?: string;
  panel?: AppPanelKey;
};

/**
 * Settings that live outside this page. Without these the workspace page,
 * the service integrations and the API keys are only reachable if you already
 * know where they are — people look for them here first.
 */
const LINKS: ElsewhereLink[] = [
  { href: '/workspaces/overview', key: 'workspace', fallback: 'Workspace', icon: UserCircle },
  { panel: 'integrations', key: 'integrations', fallback: 'Integrations', icon: Cloud },
  { panel: 'plugins', key: 'developer', fallback: 'API keys & webhooks', icon: Shield },
];

export function SettingsElsewhereLinks({ tx }: { tx: Tx }) {
  return (
    <>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ px: 1.5, display: 'block', pb: 0.5 }}
      >
        {tx(['navigation', 'elsewhere'], 'Elsewhere')}
      </Typography>
      {LINKS.map(link => (
        <Box
          key={link.key}
          {...(link.panel
            ? {
                component: 'button' as const,
                type: 'button' as const,
                onClick: () => openAppPanel(link.panel as AppPanelKey),
              }
            : { component: Link, href: link.href as string })}
          sx={{
            border: 'none',
            bgcolor: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            font: 'inherit',
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            gap: 1.5,
            borderRadius: tokens.radius.md,
            px: 1.5,
            py: 1.25,
            fontSize: 14,
            fontWeight: 500,
            color: 'text.secondary',
            textDecoration: 'none',
            '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              height: 32,
              width: 32,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: tokens.radius.sm,
              color: 'text.secondary',
            }}
          >
            <link.icon size={18} />
          </Box>
          <span>{tx(['navigation', 'links', link.key], link.fallback)}</span>
        </Box>
      ))}
    </>
  );
}
