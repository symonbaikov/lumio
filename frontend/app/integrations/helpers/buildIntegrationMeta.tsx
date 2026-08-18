'use client';

import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined';
import CloudQueueOutlinedIcon from '@mui/icons-material/CloudQueueOutlined';
import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import TelegramIcon from '@mui/icons-material/Telegram';
import type React from 'react';
import type { IntegrationAction } from '../components/IntegrationCard';

export interface IntegrationMeta {
  key: string;
  name: string;
  description: React.ReactNode;
  badge: React.ReactNode;
  category: string;
  recommended: boolean;
  icon: React.ReactNode;
  actions: IntegrationAction[];
  statusPath?: string;
}

interface CardT {
  description: React.ReactNode;
  badge: React.ReactNode;
  actions: {
    connect?: React.ReactNode;
    docs?: React.ReactNode;
    setup?: React.ReactNode;
    guide?: React.ReactNode;
  };
}

interface IntegrationsT {
  cards: {
    telegram: CardT;
  };
}

const muiIconSx = { fontSize: 32 };

function buildProtocolIcon(key: string): React.ReactNode {
  switch (key) {
    case 'ai-compatible':
      return <SmartToyOutlinedIcon sx={muiIconSx} aria-hidden="true" />;
    case 'smtp':
      return <AlternateEmailOutlinedIcon sx={muiIconSx} aria-hidden="true" />;
    case 'app-url':
      return <LinkOutlinedIcon sx={muiIconSx} aria-hidden="true" />;
    case 's3-compatible':
      return <DnsOutlinedIcon sx={muiIconSx} aria-hidden="true" />;
    case 'webdav':
      return <CloudQueueOutlinedIcon sx={muiIconSx} aria-hidden="true" />;
    case 'imap':
      return <MarkEmailUnreadOutlinedIcon sx={muiIconSx} aria-hidden="true" />;
    case 'workbook-import':
      return <TableChartOutlinedIcon sx={muiIconSx} aria-hidden="true" />;
    default:
      return <CloudQueueOutlinedIcon sx={muiIconSx} aria-hidden="true" />;
  }
}

function makeProtocolEntry(input: {
  key: string;
  name: string;
  description: React.ReactNode;
  badge: React.ReactNode;
  category: string;
  docsHref: string;
}): IntegrationMeta {
  return {
    key: input.key,
    name: input.name,
    description: input.description,
    badge: input.badge,
    category: input.category,
    recommended: true,
    icon: buildProtocolIcon(input.key),
    actions: [
      { label: 'Configure', href: `/integrations/${input.key}`, primary: true },
      { label: 'Docs', href: input.docsHref, external: true },
    ],
  };
}

function makeTelegram(card: CardT): IntegrationMeta {
  return {
    key: 'telegram',
    name: 'Telegram',
    description: card.description,
    badge: card.badge,
    category: 'messaging',
    recommended: false,
    icon: <TelegramIcon sx={muiIconSx} aria-hidden="true" />,
    actions: [
      { label: card.actions.setup, href: '/settings/telegram', primary: true },
      { label: card.actions.guide, href: 'https://core.telegram.org/bots', external: true },
    ],
  };
}

export function buildIntegrationMeta(t: IntegrationsT): IntegrationMeta[] {
  return [
    {
      ...makeProtocolEntry({
        key: 'ai-compatible',
        name: 'AI-compatible endpoint',
        description: 'Use Ollama, LocalAI, vLLM, or another OpenAI-compatible backend.',
        badge: 'Open protocol',
        category: 'ai',
        docsHref: 'https://github.com/ollama/ollama/blob/main/docs/api.md',
      }),
      statusPath: '/settings/integrations/ai',
    },
    {
      ...makeProtocolEntry({
        key: 'smtp',
        name: 'SMTP email',
        description: 'Send invitations through any SMTP-compatible mail server.',
        badge: 'Open protocol',
        category: 'email',
        docsHref: 'https://datatracker.ietf.org/doc/html/rfc5321',
      }),
      statusPath: '/settings/email/smtp',
    },
    {
      ...makeProtocolEntry({
        key: 'app-url',
        name: 'Application URL',
        description: 'Configure the public URL used in invitations and shared links.',
        badge: 'Workspace setting',
        category: 'application',
        docsHref: '/integrations/app-url',
      }),
      statusPath: '/settings/app',
    },
    makeProtocolEntry({
      key: 's3-compatible',
      name: 'S3-compatible storage',
      description: 'Sync statements with MinIO or another S3-compatible bucket.',
      badge: 'OSS protocol',
      category: 'storage',
      docsHref: 'https://min.io/docs/minio/linux/developers/javascript/API.html',
    }),
    makeProtocolEntry({
      key: 'webdav',
      name: 'WebDAV storage',
      description: 'Import and sync files through Nextcloud or another WebDAV-compatible server.',
      badge: 'Open protocol',
      category: 'storage',
      docsHref: 'https://datatracker.ietf.org/doc/html/rfc4918',
    }),
    makeProtocolEntry({
      key: 'imap',
      name: 'IMAP inbox',
      description: 'Poll any IMAP mailbox for receipt and invoice attachments.',
      badge: 'Open protocol',
      category: 'email',
      docsHref: 'https://datatracker.ietf.org/doc/html/rfc9051',
    }),
    makeProtocolEntry({
      key: 'workbook-import',
      name: 'Workbook and Google Sheets import',
      description:
        'Import custom tables from XLSX, CSV, ODS, or a shared Google Sheets link without OAuth.',
      badge: 'File based',
      category: 'spreadsheets',
      docsHref: '/custom-tables',
    }),
    { ...makeTelegram(t.cards.telegram), statusPath: '/settings/notifications/telegram' },
  ];
}
