'use client';

import { BackgroundSelector } from '@/app/(main)/workspaces/components/BackgroundSelector';
import { CurrencySelector } from '@/app/(main)/workspaces/components/CurrencySelector';
import { AVAILABLE_BACKGROUNDS } from '@/app/(main)/workspaces/constants';
import { useIntlayer } from '@/app/i18n';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { getNestedOnboardingValue, resolveOnboardingText } from '../lib/resolveOnboardingText';
import type { SupportedLocale } from '../useOnboardingWizard';
import { tokens } from '@/lib/theme-tokens';

interface WorkspaceStepProps {
  locale: SupportedLocale;
  workspaceName: string;
  workspaceCurrency: string;
  workspaceBackgroundImage: string | null;
  onWorkspaceNameChange: (value: string) => void;
  onWorkspaceCurrencyChange: (value: string) => void;
  onWorkspaceBackgroundImageChange: (value: string | null) => void;
  onCurrencyPickerOpenChange?: (open: boolean) => void;
}

export function WorkspaceStep({
  locale,
  workspaceName,
  workspaceCurrency,
  workspaceBackgroundImage,
  onWorkspaceNameChange,
  onWorkspaceCurrencyChange,
  onWorkspaceBackgroundImageChange,
  onCurrencyPickerOpenChange,
}: WorkspaceStepProps) {
  const t = useIntlayer('onboardingPage');
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const text = (path: string[], fallback = '') =>
    resolveOnboardingText(getNestedOnboardingValue(t, path), fallback, locale);

  useEffect(() => {
    onCurrencyPickerOpenChange?.(currencyPickerOpen);
  }, [currencyPickerOpen, onCurrencyPickerOpenChange]);

  useEffect(
    () => () => {
      onCurrencyPickerOpenChange?.(false);
    },
    [onCurrencyPickerOpenChange],
  );

  const isCustomBackground = Boolean(
    workspaceBackgroundImage && !AVAILABLE_BACKGROUNDS.includes(workspaceBackgroundImage),
  );

  if (currencyPickerOpen) {
    return (
      <Box component="section">
        <Stack spacing={2}>
          <Box sx={{ width: '100%' }}>
            <CurrencySelector
              selectedCurrency={workspaceCurrency || null}
              onSelect={value => onWorkspaceCurrencyChange(value)}
              mode="inline"
              open={currencyPickerOpen}
              onOpenChange={setCurrencyPickerOpen}
              showLabel={false}
              showTrigger={false}
              minimal
            />

            <Box sx={{ mt: 1.5 }}>
              <Button
                variant="outlined"
                onClick={() => setCurrencyPickerOpen(false)}
                sx={{
                  borderRadius: tokens.radius.md,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  fontWeight: 600,
                  fontSize: 14,
                  textTransform: 'none',
                  px: 2,
                  py: 0.75,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                {text(['navigation', 'back'], 'Back')}
              </Button>
            </Box>
          </Box>
        </Stack>
      </Box>
    );
  }

  return (
    <Box component="section">
      <Stack spacing={2}>
        <Box>
          <Typography
            variant="h4"
            style={{ fontWeight: 600 }}
            sx={{ fontSize: { xs: 24, sm: 30 }, color: 'text.primary' }}
          >
            {text(['workspace', 'title'], 'Set up your first workspace')}
          </Typography>
          <Typography
            style={{ marginTop: 6 }}
            sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }}
          >
            {text(
              ['workspace', 'subtitle'],
              'Set workspace name and default currency for accurate data tracking.',
            )}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', xl: 'minmax(0,1fr) minmax(280px,420px)' },
          }}
        >
          <Stack spacing={1}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--mui-palette-text-secondary)',
              }}
              htmlFor="workspace-name"
            >
              {text(['workspace', 'nameLabel'], 'Workspace name')}
            </label>
            <input
              id="workspace-name"
              type="text"
              value={workspaceName}
              onChange={event => onWorkspaceNameChange(event.target.value)}
              placeholder={text(
                ['workspace', 'namePlaceholder'],
                'For example: My Company workspace',
              )}
              style={{
                width: '100%',
                border: '1px solid var(--mui-palette-divider)',
                borderRadius: tokens.radius.md,
                background: 'var(--mui-palette-background-paper)',
                padding: '10px 12px',
                fontSize: 14,
                color: 'var(--mui-palette-text-primary)',
              }}
            />
          </Stack>

          <Stack spacing={0.5}>
            <CurrencySelector
              selectedCurrency={workspaceCurrency || null}
              onSelect={value => onWorkspaceCurrencyChange(value)}
              mode="inline"
              open={currencyPickerOpen}
              onOpenChange={setCurrencyPickerOpen}
            />
            <Typography style={{ fontSize: 12 }} sx={{ color: 'text.secondary' }}>
              {text(
                ['workspace', 'currencyHint'],
                'This currency will be used by default for new records.',
              )}
            </Typography>
          </Stack>
        </Box>

        <Stack spacing={1}>
          <Typography
            style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em' }}
            sx={{ color: 'text.secondary' }}
          >
            {text(['workspace', 'backgroundLabel'], 'Workspace background')}
          </Typography>

          <BackgroundSelector
            selectedBackground={
              workspaceBackgroundImage && AVAILABLE_BACKGROUNDS.includes(workspaceBackgroundImage)
                ? workspaceBackgroundImage
                : null
            }
            onSelect={onWorkspaceBackgroundImageChange}
            backgrounds={AVAILABLE_BACKGROUNDS}
            compact
          />

          <Stack spacing={0.75}>
            <label
              style={{ fontSize: 12, color: 'var(--mui-palette-text-primary)' }}
              htmlFor="workspace-custom-background"
            >
              {text(['workspace', 'customBackgroundLabel'], 'Custom image (URL)')}
            </label>
            <input
              id="workspace-custom-background"
              type="url"
              value={isCustomBackground ? workspaceBackgroundImage || '' : ''}
              onChange={event => onWorkspaceBackgroundImageChange(event.target.value || null)}
              placeholder={text(
                ['workspace', 'customBackgroundPlaceholder'],
                'https://example.com/my-image.jpg',
              )}
              style={{
                width: '100%',
                border: '1px solid var(--mui-palette-divider)',
                borderRadius: tokens.radius.md,
                background: 'var(--mui-palette-background-paper)',
                padding: '10px 12px',
                fontSize: 14,
                color: 'var(--mui-palette-text-primary)',
              }}
            />
            <Typography style={{ fontSize: 12 }} sx={{ color: 'text.secondary' }}>
              {text(
                ['workspace', 'customBackgroundHint'],
                'Paste your own image URL or choose one of the presets below.',
              )}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
