/* eslint-disable max-lines */
'use client';

import { CheckCircle2, ExternalLink, Search, Star } from '@/app/components/icons';
import { EmptyStateIllustration } from '@/app/components/ui/EmptyStateIllustration';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { tokens } from '@/lib/theme-tokens';
import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import CloudQueueOutlinedIcon from '@mui/icons-material/CloudQueueOutlined';
import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import { Box, Stack, Typography } from '@mui/material';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';

// eslint-disable-next-line max-lines-per-function, complexity
export default function IntegrationsPage(): React.JSX.Element {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  const t = useIntlayer('integrationsPage');
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Static integration metadata (labels, icons, actions). Active/connect status is fetched from backend.
  const integrationMeta = useMemo(
    // eslint-disable-next-line max-lines-per-function
    () => [
      {
        key: 'ai-compatible',
        name: 'AI-compatible endpoint',
        description: 'Use Ollama, LocalAI, vLLM, or another OpenAI-compatible backend.',
        badge: 'Open protocol',
        category: 'ai',
        recommended: true,
        icon: <SmartToyOutlinedIcon sx={{ fontSize: 32 }} aria-hidden="true" />,
        statusPath: '/settings/integrations/ai',
        actions: [
          { label: 'Configure', href: '/integrations/ai-compatible', primary: true },
          {
            label: 'Docs',
            href: 'https://github.com/ollama/ollama/blob/main/docs/api.md',
            external: true,
          },
        ],
      },
      {
        key: 'local-categorization',
        name: 'Local categorization',
        description: 'Install a local Transformers.js model for private receipt categorization.',
        badge: 'Local model',
        category: 'ai',
        recommended: true,
        icon: <CategoryOutlinedIcon sx={{ fontSize: 32 }} aria-hidden="true" />,
        statusPath: '/settings/local-categorization',
        actions: [
          { label: 'Configure', href: '/integrations/local-categorization', primary: true },
        ],
      },
      {
        key: 'smtp',
        name: 'SMTP email',
        description: 'Send invitations through any SMTP-compatible mail server.',
        badge: 'Open protocol',
        category: 'email',
        recommended: true,
        icon: <AlternateEmailOutlinedIcon sx={{ fontSize: 32 }} aria-hidden="true" />,
        statusPath: '/settings/email/smtp',
        actions: [
          { label: 'Configure', href: '/integrations/smtp', primary: true },
          { label: 'Docs', href: 'https://datatracker.ietf.org/doc/html/rfc5321', external: true },
        ],
      },
      {
        key: 'app-url',
        name: 'Application URL',
        description: 'Configure the public URL used in invitations and shared links.',
        badge: 'Workspace setting',
        category: 'application',
        recommended: true,
        icon: <LinkOutlinedIcon sx={{ fontSize: 32 }} aria-hidden="true" />,
        statusPath: '/settings/app',
        actions: [{ label: 'Configure', href: '/integrations/app-url', primary: true }],
      },
      {
        key: 's3-compatible',
        name: 'S3-compatible storage',
        description: 'Sync statements with an S3-compatible bucket such as MinIO.',
        badge: 'OSS protocol',
        category: 'storage',
        recommended: true,
        icon: <DnsOutlinedIcon sx={{ fontSize: 32 }} aria-hidden="true" />,
        actions: [
          { label: 'Configure', href: '/integrations/s3-compatible', primary: true },
          {
            label: 'Docs',
            href: 'https://min.io/docs/minio/linux/developers/javascript/API.html',
            external: true,
          },
        ],
      },
      {
        key: 'webdav',
        name: 'WebDAV storage',
        description: 'Import and sync files through WebDAV-compatible storage such as Nextcloud.',
        badge: 'Open protocol',
        category: 'storage',
        recommended: true,
        icon: <CloudQueueOutlinedIcon sx={{ fontSize: 32 }} aria-hidden="true" />,
        actions: [
          { label: 'Configure', href: '/integrations/webdav', primary: true },
          {
            label: 'Docs',
            href: 'https://datatracker.ietf.org/doc/html/rfc4918',
            external: true,
          },
        ],
      },
      {
        key: 'imap',
        name: 'IMAP inbox',
        description: 'Poll any IMAP mailbox for receipts and invoice attachments.',
        badge: 'Open protocol',
        category: 'email',
        recommended: true,
        icon: <MarkEmailUnreadOutlinedIcon sx={{ fontSize: 32 }} aria-hidden="true" />,
        actions: [
          { label: 'Configure', href: '/integrations/imap', primary: true },
          {
            label: 'Docs',
            href: 'https://datatracker.ietf.org/doc/html/rfc9051',
            external: true,
          },
        ],
      },
      {
        key: 'workbook-import',
        name: 'Workbook and Google Sheets import',
        description:
          'Import custom tables from XLSX, CSV, ODS, or a shared Google Sheets link without OAuth.',
        badge: 'File based',
        category: 'spreadsheets',
        recommended: true,
        icon: <TableChartOutlinedIcon sx={{ fontSize: 32 }} aria-hidden="true" />,
        actions: [
          { label: 'Import from link', href: '/custom-tables/import/google-sheets', primary: true },
          { label: 'Open tables', href: '/custom-tables', primary: false },
          { label: 'Docs', href: '/custom-tables', external: false },
        ],
      },
      {
        key: 'telegram',
        name: 'Telegram',
        description: t.cards.telegram.description,
        badge: t.cards.telegram.badge,
        category: 'messaging',
        recommended: false,
        icon: (
          <Image
            src="/icons/icons8-telegram-48.png"
            alt="Telegram"
            width={32}
            height={32}
            style={{ borderRadius: tokens.radius.md }}
          />
        ),
        statusPath: '/settings/notifications/telegram',
        actions: [
          { label: t.cards.telegram.actions.setup, href: '/settings/telegram', primary: true },
          {
            label: t.cards.telegram.actions.guide,
            href: 'https://core.telegram.org/bots',
            external: true,
          },
        ],
      },
    ],
    [t],
  );

  // Integration statuses fetched from backend per-integration
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;

    const loadStatuses = async (): Promise<void> => {
      const map: Record<string, boolean> = {};

      await Promise.all(
        // eslint-disable-next-line complexity
        integrationMeta.map(async m => {
          try {
            const resp = await apiClient.get(m.statusPath || `/integrations/${m.key}/status`);
            const data = resp.data || {};
            // Support different shapes: { connected: boolean } or { status: 'connected' | ... }
            const connected =
              Boolean(data?.connected) || String(data?.status)?.toLowerCase() === 'connected';
            map[m.key] = connected;
          } catch {
            // If endpoint missing or error, treat as not connected
            map[m.key] = false;
          }
        }),
      );

      if (mounted) {
        setIntegrationStatuses(prev => ({ ...prev, ...map }));
      }
    };

    void loadStatuses();

    return () => {
      mounted = false;
    };
  }, [integrationMeta]);

  // Merge metadata with fetched statuses to produce final integrations list used for filtering/display.
  const integrations = useMemo(
    () =>
      integrationMeta.map(m => ({
        ...m,
        active: integrationStatuses[m.key] ?? false,
        primaryAction: m.actions.find(action => action.primary) ?? m.actions[0],
      })),
    [integrationMeta, integrationStatuses],
  );

  const filteredIntegrations = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return integrations;

    return integrations.filter(
      item =>
        item.name.toLowerCase().includes(query) ||
        String(item.description).toLowerCase().includes(query),
    );
  }, [integrations, searchQuery]);

  const handleCardClick = (item: (typeof integrations)[number]): void => {
    if (!item.primaryAction?.href || item.primaryAction.external) return;
    router.push(item.primaryAction.href);
  };

  const active = filteredIntegrations.filter(item => item.active);
  const available = filteredIntegrations.filter(item => !item.active);

  const categories = [
    {
      key: 'ai',
      label: 'AI',
    },
    {
      key: 'application',
      label: 'Application',
    },
    {
      key: 'storage',
      label: t.categories.storage,
    },
    {
      key: 'email',
      label: t.categories.email,
    },
    {
      key: 'spreadsheets',
      label: t.categories.spreadsheets,
    },
    {
      key: 'messaging',
      label: t.categories.messaging,
    },
  ] as const;

  const groupByCategory = <T extends { category: string }>(items: T[]): Map<string, T[]> => {
    const grouped = new Map<string, T[]>();
    for (const item of items) {
      const next = grouped.get(item.category) ?? [];
      next.push(item);
      grouped.set(item.category, next);
    }
    return grouped;
  };

  const activeByCategory = groupByCategory(active);
  const availableByCategory = groupByCategory(available);

  // eslint-disable-next-line max-lines-per-function, complexity
  const renderCard = (item: (typeof integrations)[number]): React.JSX.Element => (
    <Box
      key={item.key}
      data-integration-card={item.key}
      role={item.primaryAction?.href && !item.primaryAction.external ? 'button' : undefined}
      tabIndex={item.primaryAction?.href && !item.primaryAction.external ? 0 : undefined}
      sx={{
        border: `1px solid ${c.ink150}`,
        borderRadius: tokens.radius.lg,
        p: 2,
        bgcolor: 'background.paper',
        boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
        cursor: item.primaryAction?.href && !item.primaryAction.external ? 'pointer' : 'default',
        '&:hover': {
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        },
        '&:focus-visible': {
          outline: '2px solid var(--color-primary)',
          outlineOffset: 2,
        },
      }}
      onClick={() => handleCardClick(item)}
      onKeyDown={event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        handleCardClick(item);
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box
          sx={{
            p: 1,
            borderRadius: tokens.radius.sm,
            bgcolor: c.ink50,
            border: `1px solid ${c.ink100}`,
            display: 'flex',
          }}
        >
          {item.icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography style={{ fontSize: 18, fontWeight: 600, color: c.ink900 }}>
              {item.name}
            </Typography>
            {item.recommended && (
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  px: 1,
                  py: 0.25,
                  bgcolor: 'var(--color-warning-soft-bg)',
                  color: 'var(--color-warning-soft-text)',
                  border: '1px solid var(--color-warning-soft-border)',
                  borderRadius: tokens.radius.sm,
                }}
              >
                <Star style={{ height: 12, width: 12, marginRight: 4 }} />
                {t.recommendedBadge}
              </Box>
            )}
            {!item.recommended && (
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  px: 1,
                  py: 0.25,
                  bgcolor: 'var(--color-success-soft-bg)',
                  color: 'var(--color-success-soft-text)',
                  border: '1px solid var(--color-success-soft-border)',
                  borderRadius: tokens.radius.sm,
                }}
              >
                <CheckCircle2 style={{ height: 12, width: 12, marginRight: 4 }} /> {item.badge}
              </Box>
            )}
          </Box>
          <Typography style={{ fontSize: 14, color: c.ink700, marginTop: 4 }}>
            {item.description}
          </Typography>
          <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {/* eslint-disable-next-line max-lines-per-function */}
            {item.actions.map(action =>
              action.external ? (
                <a
                  key={`${action.label}-${action.href}`}
                  href={action.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={event => event.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 500,
                    border: `1px solid ${c.ink150}`,
                    borderRadius: tokens.radius.md,
                    color: c.ink800,
                    textDecoration: 'none',
                  }}
                >
                  {action.label}
                  <ExternalLink style={{ height: 12, width: 12, marginLeft: 4, color: c.ink400 }} />
                </a>
              ) : action.primary && item.active ? (
                <button
                  key={`${action.label}-${action.href}`}
                  type="button"
                  disabled
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 500,
                    border: `1px solid ${c.ink150}`,
                    borderRadius: tokens.radius.md,
                    color: c.ink400,
                    cursor: 'not-allowed',
                    background: 'transparent',
                  }}
                  onClick={event => event.stopPropagation()}
                >
                  {action.label}
                </button>
              ) : action.primary ? (
                <Link
                  key={`${action.label}-${action.href}`}
                  href={action.href}
                  onClick={event => event.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 16px',
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: tokens.radius.md,
                    background: 'var(--color-primary)',
                    color: c.surface,
                    textDecoration: 'none',
                  }}
                >
                  {action.label}
                </Link>
              ) : (
                <Link
                  key={`${action.label}-${action.href}`}
                  href={action.href}
                  onClick={event => event.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 500,
                    border: `1px solid ${c.ink150}`,
                    borderRadius: tokens.radius.md,
                    color: c.ink800,
                    textDecoration: 'none',
                  }}
                >
                  {action.label}
                </Link>
              ),
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const renderCategoryDivider = (label: React.ReactNode): React.JSX.Element => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
      <Box sx={{ height: '1px', flex: 1, bgcolor: c.ink150 }} />
      <Box
        component="span"
        sx={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: c.ink500,
          px: 1.5,
          py: 0.5,
          border: `1px solid ${c.ink150}`,
          borderRadius: tokens.radius.sm,
          bgcolor: 'background.paper',
        }}
      >
        {label}
      </Box>
      <Box sx={{ height: '1px', flex: 1, bgcolor: c.ink150 }} />
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
            <Typography variant="h4" style={{ fontWeight: 700, color: c.ink900 }}>
              {t.title}
            </Typography>
            <Typography style={{ marginTop: 4, color: c.ink500 }}>{t.subtitle}</Typography>
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
            <Search style={{ height: 16, width: 16, color: c.ink400 }} />
          </Box>
          <input
            type="text"
            data-tour-id="integrations-search"
            style={{
              display: 'block',
              width: '100%',
              border: `1px solid ${c.ink150}`,
              borderRadius: tokens.radius.md,
              background: 'var(--card-bg)',
              padding: '8px 16px 8px 40px',
              fontSize: 14,
              color: c.ink900,
            }}
            placeholder={t.searchPlaceholder.value}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
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
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
          }}
        >
          <Star
            style={{
              height: 20,
              width: 20,
              color: 'var(--color-primary)',
              marginTop: 2,
              flexShrink: 0,
            }}
          />
          <Box>
            <Typography style={{ fontSize: 14, fontWeight: 500, color: c.ink900 }}>
              {t.banner}
            </Typography>
          </Box>
        </Box>
      )}

      <Stack spacing={4}>
        {active.length > 0 || !searchQuery ? (
          <Box data-tour-id="integrations-connected">
            <Typography
              style={{ fontSize: 14, fontWeight: 600, color: c.ink800, marginBottom: 12 }}
            >
              {t.sections.connected}
            </Typography>
            {active.length === 0 && !searchQuery ? (
              <Box
                sx={{
                  borderRadius: tokens.radius.lg,
                  border: `1px dashed ${c.ink150}`,
                  bgcolor: c.ink50,
                  p: 2,
                }}
              >
                <EmptyStateIllustration name="integrations" size="sm" />
                <Typography style={{ fontSize: 14, color: c.ink700, textAlign: 'center' }}>
                  {t.empty.connected}
                </Typography>
              </Box>
            ) : (
              <Stack spacing={3}>
                {categories.map(category => {
                  const items = activeByCategory.get(category.key) ?? [];
                  if (items.length === 0) return null;
                  return (
                    <Box key={`active-${category.key}`}>
                      {renderCategoryDivider(category.label)}
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
                        {items.map(item => renderCard(item))}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        ) : null}

        {available.length > 0 || !searchQuery ? (
          <Box data-tour-id="integrations-available">
            <Typography
              style={{ fontSize: 14, fontWeight: 600, color: c.ink800, marginBottom: 12 }}
            >
              {t.sections.available}
            </Typography>
            {available.length === 0 && !searchQuery ? (
              <Box
                sx={{
                  borderRadius: tokens.radius.lg,
                  border: `1px dashed ${c.ink150}`,
                  bgcolor: c.ink50,
                  p: 2,
                }}
              >
                <Typography style={{ fontSize: 14, color: c.ink700 }}>
                  {t.empty.available}
                </Typography>
              </Box>
            ) : (
              <Stack spacing={3}>
                {/* eslint-disable-next-line max-lines-per-function */}
                {categories.map(category => {
                  const items = availableByCategory.get(category.key) ?? [];
                  if (items.length === 0) return null;
                  return (
                    <Box key={`available-${category.key}`}>
                      {renderCategoryDivider(category.label)}
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
                        data-tour-id={undefined}
                      >
                        {items.map(item => renderCard(item))}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        ) : null}

        {searchQuery && filteredIntegrations.length === 0 && (
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
                bgcolor: c.ink100,
                p: 2,
                display: 'flex',
              }}
            >
              <Search style={{ height: 32, width: 32, color: c.ink400 }} />
            </Box>
            <Typography style={{ fontSize: 18, fontWeight: 500, color: c.ink900 }}>
              {t.noResults.value}
            </Typography>
            <Typography style={{ color: c.ink500, marginTop: 4 }}>
              {t.noResultsDescription.value.replace('{{query}}', searchQuery)}
            </Typography>
            <button
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
              {t.resetSearch.value}
            </button>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
