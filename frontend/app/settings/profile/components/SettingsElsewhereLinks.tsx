'use client';

import { Cloud, Shield, UserCircle } from '@/app/components/icons';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

type Tx = (path: string[], fallback: string) => string;

/**
 * Settings that live on their own routes. Without these the workspace page,
 * the service integrations and the API keys are only reachable if you already
 * know where they are — people look for them here first.
 */
const LINKS = [
  { href: '/workspaces/overview', key: 'workspace', fallback: 'Workspace', icon: UserCircle },
  { href: '/integrations', key: 'integrations', fallback: 'Integrations', icon: Cloud },
  { href: '/plugins', key: 'developer', fallback: 'API keys & webhooks', icon: Shield },
] as const;

export function SettingsElsewhereLinks({ tx }: { tx: Tx }) {
  return (
    <>
      <Divider sx={{ my: 1 }} />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ px: 1.5, display: 'block', pb: 0.5 }}
      >
        {tx(['navigation', 'elsewhere'], 'Elsewhere')}
      </Typography>
      {LINKS.map(link => (
        <Box
          key={link.href}
          component={Link}
          href={link.href}
          sx={{
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
