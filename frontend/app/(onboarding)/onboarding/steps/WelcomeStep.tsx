'use client';

import { Box, Stack, Typography } from '@mui/material';
import { CheckCircle2, ShieldCheck, Sparkles, Workflow } from '@/app/components/icons';
import { useIntlayer } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import { getNestedOnboardingValue, resolveOnboardingText } from '../lib/resolveOnboardingText';

export function WelcomeStep() {
  const t = useIntlayer('onboardingPage');
  const text = (path: string[], fallback = '') =>
    resolveOnboardingText(getNestedOnboardingValue(t, path), fallback);

  return (
    <Box component="section">
      <Stack spacing={3}>
        <Box>
          <Typography
            variant="h3"
            style={{ fontWeight: 600, lineHeight: 1.2 }}
            sx={{ fontSize: { xs: 30, sm: 36 }, color: 'text.primary' }}
          >
            {text(['welcome', 'title'], "Let's tailor Lumio for you")}
          </Typography>
          <Typography
            style={{ marginTop: 12, maxWidth: 672, lineHeight: 1.75 }}
            sx={{ fontSize: 16, color: 'text.secondary' }}
          >
            {text(
              ['welcome', 'subtitle'],
              'This takes a couple of minutes: choose language, default currency, and integrations.',
            )}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
          }}
        >
          <Box
            sx={{
              borderRadius: tokens.radius.lg,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              p: 2,
            }}
          >
            <Sparkles style={{ height: 20, width: 20, color: 'var(--mui-palette-primary-main)' }} />
            <Typography
              style={{ marginTop: 12, fontSize: 14, fontWeight: 500 }}
              sx={{ color: 'text.primary' }}
            >
              {text(['welcome', 'points', 'fastSetup'], 'Quick initial setup')}
            </Typography>
          </Box>
          <Box
            sx={{
              borderRadius: tokens.radius.lg,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              p: 2,
            }}
          >
            <Workflow style={{ height: 20, width: 20, color: 'var(--mui-palette-primary-main)' }} />
            <Typography
              style={{ marginTop: 12, fontSize: 14, fontWeight: 500 }}
              sx={{ color: 'text.primary' }}
            >
              {text(['welcome', 'points', 'integrations'], 'Connect services in one click')}
            </Typography>
          </Box>
          <Box
            sx={{
              borderRadius: tokens.radius.lg,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              p: 2,
            }}
          >
            <ShieldCheck
              style={{ height: 20, width: 20, color: 'var(--mui-palette-primary-main)' }}
            />
            <Typography
              style={{ marginTop: 12, fontSize: 14, fontWeight: 500 }}
              sx={{ color: 'text.primary' }}
            >
              {text(['welcome', 'points', 'control'], 'Clear start and full control')}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            borderRadius: tokens.radius.lg,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            p: 2,
          }}
        >
          <Typography
            style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}
            sx={{ color: 'text.primary' }}
          >
            {text(['welcome', 'nextTitle'], 'What happens next')}
          </Typography>
          <Stack component="ul" spacing={1} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle2
                style={{
                  height: 16,
                  width: 16,
                  color: 'var(--mui-palette-primary-main)',
                  flexShrink: 0,
                }}
              />
              <Typography style={{ fontSize: 14 }} sx={{ color: 'text.secondary' }}>
                {text(['welcome', 'nextSteps', 'language'], 'Pick interface language and timezone')}
              </Typography>
            </Box>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle2
                style={{
                  height: 16,
                  width: 16,
                  color: 'var(--mui-palette-primary-main)',
                  flexShrink: 0,
                }}
              />
              <Typography style={{ fontSize: 14 }} sx={{ color: 'text.secondary' }}>
                {text(
                  ['welcome', 'nextSteps', 'workspace'],
                  'Set workspace name, currency, and background',
                )}
              </Typography>
            </Box>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle2
                style={{
                  height: 16,
                  width: 16,
                  color: 'var(--mui-palette-primary-main)',
                  flexShrink: 0,
                }}
              />
              <Typography style={{ fontSize: 14 }} sx={{ color: 'text.secondary' }}>
                {text(
                  ['welcome', 'nextSteps', 'integrations'],
                  'Connect integrations you need right now',
                )}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
