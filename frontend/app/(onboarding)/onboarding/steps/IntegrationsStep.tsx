'use client';

import { Box, Button, Stack, Typography } from '@mui/material';
import type { LucideIcon } from '@/app/components/icons';
import { Spinner } from '@/app/components/ui/spinner';
import { useIntlayer } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import { getNestedOnboardingValue, resolveOnboardingText } from '../lib/resolveOnboardingText';

export interface OnboardingIntegrationCard {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  connected: boolean;
  loading: boolean;
  actionLabel: string;
}

interface IntegrationsStepProps {
  cards: OnboardingIntegrationCard[];
  onConnect: (integrationKey: string) => void;
}

export function IntegrationsStep({ cards, onConnect }: IntegrationsStepProps) {
  const t = useIntlayer('onboardingPage');
  const text = (path: string[], fallback = '') =>
    resolveOnboardingText(getNestedOnboardingValue(t, path), fallback);

  return (
    <Box component="section">
      <Stack spacing={3}>
        <Box>
          <Typography
            variant="h4"
            style={{ fontWeight: 600 }}
            sx={{ fontSize: { xs: 24, sm: 30 }, color: 'text.primary' }}
          >
            {text(['integrations', 'title'], 'Connect your integrations')}
          </Typography>
          <Typography
            style={{ marginTop: 8 }}
            sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }}
          >
            {text(
              ['integrations', 'subtitle'],
              'Pick services you want to set up now. You can connect them later as well.',
            )}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          }}
        >
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <Box
                key={card.key}
                component="article"
                sx={{
                  borderRadius: tokens.radius.lg,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  p: 2,
                  boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Box
                      sx={{
                        mb: 1.5,
                        display: 'inline-flex',
                        borderRadius: tokens.radius.sm,
                        border: '1px solid',
                        borderColor: 'primary.light',
                        bgcolor: 'primary.50',
                        p: 1,
                      }}
                    >
                      <Icon size={24} aria-hidden />
                    </Box>
                    <Typography
                      style={{ fontSize: 14, fontWeight: 600 }}
                      sx={{ color: 'text.primary' }}
                    >
                      {card.title}
                    </Typography>
                    <Typography
                      style={{ marginTop: 4, fontSize: 14 }}
                      sx={{ color: 'text.secondary' }}
                    >
                      {card.description}
                    </Typography>
                  </Box>

                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      flexShrink: 0,
                      borderRadius: tokens.radius.sm,
                      px: 1,
                      py: 0.5,
                      fontSize: 12,
                      fontWeight: 600,
                      border: '1px solid',
                      borderColor: card.connected ? 'primary.light' : 'divider',
                      bgcolor: card.connected ? 'primary.50' : 'action.hover',
                      color: card.connected ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {card.connected
                      ? text(['integrations', 'connectedBadge'], 'Connected')
                      : text(['integrations', 'availableBadge'], 'Available')}
                  </Box>
                </Box>

                <Button
                  variant={card.connected ? 'outlined' : 'contained'}
                  size="small"
                  onClick={() => onConnect(card.key)}
                  disabled={card.connected || card.loading}
                  startIcon={card.loading ? <Spinner size={14} /> : undefined}
                  sx={{
                    mt: 2,
                    borderRadius: tokens.radius.md,
                    fontWeight: 600,
                    fontSize: 12,
                    textTransform: 'none',
                    ...(card.connected && {
                      borderColor: 'divider',
                      color: 'text.secondary',
                      bgcolor: 'action.hover',
                    }),
                  }}
                >
                  {card.actionLabel}
                </Button>
              </Box>
            );
          })}
        </Box>

        <Typography style={{ fontSize: 14 }} sx={{ color: 'text.secondary' }}>
          {text(
            ['integrations', 'helper'],
            'If you skip this step, you can connect integrations later in Settings -> Integrations.',
          )}
        </Typography>
      </Stack>
    </Box>
  );
}
