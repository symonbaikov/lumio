'use client';

import { Box, Stack, Typography } from '@mui/material';
import { CheckCircle2, type LucideIcon } from '@/app/components/icons';
import { useIntlayer } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import { getNestedOnboardingValue, resolveOnboardingText } from '../lib/resolveOnboardingText';
import type { SupportedLocale } from '../useOnboardingWizard';

interface ConnectedIntegration {
  key: string;
  title: string;
  icon: LucideIcon;
}

interface CompletionStepProps {
  locale: SupportedLocale;
  timeZone: string | null;
  workspaceName: string;
  workspaceCurrency: string;
  workspaceBackgroundImage: string | null;
  connectedIntegrations: ConnectedIntegration[];
}

export function CompletionStep({
  locale,
  timeZone,
  workspaceName,
  workspaceCurrency,
  workspaceBackgroundImage,
  connectedIntegrations,
}: CompletionStepProps) {
  const t = useIntlayer('onboardingPage');
  const text = (path: string[], fallback = '') =>
    resolveOnboardingText(getNestedOnboardingValue(t, path), fallback, locale);

  const localeLabel =
    locale === 'ru'
      ? text(['language', 'localeOptions', 'ru'], 'Russian')
      : locale === 'kk'
        ? text(['language', 'localeOptions', 'kk'], 'Kazakh')
        : text(['language', 'localeOptions', 'en'], 'English');

  return (
    <Box component="section">
      <Stack spacing={3}>
        <Box
          sx={{
            display: 'inline-flex',
            borderRadius: tokens.radius.full,
            border: '1px solid',
            borderColor: 'primary.light',
            bgcolor: 'primary.50',
            p: 1.5,
          }}
        >
          <CheckCircle2
            style={{ height: 28, width: 28, color: 'var(--mui-palette-primary-main)' }}
          />
        </Box>

        <Box>
          <Typography
            variant="h4"
            style={{ fontWeight: 600 }}
            sx={{ fontSize: { xs: 24, sm: 30 }, color: 'text.primary' }}
          >
            {text(['completion', 'title'], 'Done! Setup complete')}
          </Typography>
          <Typography
            style={{ marginTop: 8 }}
            sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }}
          >
            {text(
              ['completion', 'subtitle'],
              'Press the button below to continue to your workspace.',
            )}
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
          <Typography
            style={{
              marginBottom: 12,
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
            sx={{ color: 'text.secondary' }}
          >
            {text(['completion', 'summaryTitle'], 'Your setup')}
          </Typography>
          <Stack component="ul" spacing={1} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <li>
              <Typography style={{ fontSize: 14 }} sx={{ color: 'text.primary' }}>
                {text(['completion', 'summary', 'language'], 'Language: {value}').replace(
                  '{value}',
                  localeLabel,
                )}
              </Typography>
            </li>
            <li>
              <Typography style={{ fontSize: 14 }} sx={{ color: 'text.primary' }}>
                {text(['completion', 'summary', 'timeZone'], 'Timezone: {value}').replace(
                  '{value}',
                  timeZone || 'UTC',
                )}
              </Typography>
            </li>
            <li>
              <Typography style={{ fontSize: 14 }} sx={{ color: 'text.primary' }}>
                {text(['completion', 'summary', 'workspace'], 'Workspace: {value}').replace(
                  '{value}',
                  workspaceName || '-',
                )}
              </Typography>
            </li>
            <li>
              <Typography style={{ fontSize: 14 }} sx={{ color: 'text.primary' }}>
                {text(['completion', 'summary', 'currency'], 'Currency: {value}').replace(
                  '{value}',
                  workspaceCurrency || text(['completion', 'notSet'], 'not set'),
                )}
              </Typography>
            </li>
            <li>
              <Typography style={{ fontSize: 14 }} sx={{ color: 'text.primary' }}>
                {text(
                  ['completion', 'summary', 'background'],
                  'Workspace background: {value}',
                ).replace(
                  '{value}',
                  workspaceBackgroundImage
                    ? text(['completion', 'backgroundSet'], 'set')
                    : text(['completion', 'notSet'], 'not set'),
                )}
              </Typography>
            </li>
            <li>
              <Typography style={{ fontSize: 14 }} sx={{ color: 'text.primary' }}>
                {text(['completion', 'summary', 'integrations'], 'Connected integrations:')}
              </Typography>
            </li>
          </Stack>

          <Box sx={{ mt: 2, borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
            {connectedIntegrations.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                {connectedIntegrations.map(integration => {
                  const Icon = integration.icon;
                  return (
                    <Box
                      key={integration.key}
                      sx={{
                        display: 'inline-flex',
                        height: 36,
                        width: 36,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: tokens.radius.full,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'action.hover',
                      }}
                      title={integration.title}
                    >
                      <Icon size={18} aria-hidden />
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography style={{ fontSize: 14 }} sx={{ color: 'text.secondary' }}>
                {text(['completion', 'noIntegrations'], 'No integrations connected')}
              </Typography>
            )}
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
