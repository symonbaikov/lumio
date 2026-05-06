'use client';

import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined';
import CloudQueueOutlinedIcon from '@mui/icons-material/CloudQueueOutlined';
import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import TelegramIcon from '@mui/icons-material/Telegram';
import {
  ProtocolIntegrationPage,
  type ProtocolIntegrationPageProps,
} from '@/app/integrations/open-protocol-page';
import type React from 'react';
import type { OnboardingIntegrationKey } from '../hooks/useOnboardingActions';

type IntegrationConnectionConfig = Omit<
  ProtocolIntegrationPageProps,
  'embedded' | 'onConnectionStatusChange'
>;

const INTEGRATION_CONNECTION_CONFIGS: Record<
  OnboardingIntegrationKey,
  IntegrationConnectionConfig
> = {
  s3Compatible: {
    title: 'S3-compatible storage',
    description:
      'Use a MinIO or S3-compatible bucket as the storage backend for file import and scheduled sync.',
    statusPath: '/integrations/s3-compatible/status',
    settingsPath: '/integrations/s3-compatible/settings',
    disconnectPath: '/integrations/s3-compatible',
    icon: <DnsOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />,
    filesPath: '/integrations/s3-compatible/files',
    importPath: '/integrations/s3-compatible/import',
    syncPath: '/integrations/s3-compatible/sync',
    fields: [
      { name: 'endpoint', label: 'Endpoint', placeholder: 'http://localhost:9000', required: true },
      { name: 'region', label: 'Region', placeholder: 'us-east-1' },
      { name: 'bucket', label: 'Bucket', placeholder: 'lumio', required: true },
      { name: 'prefix', label: 'Prefix', placeholder: 'statements' },
      { name: 'accessKeyId', label: 'Access key ID', type: 'password' },
      { name: 'secretAccessKey', label: 'Secret access key', type: 'password' },
      { name: 'forcePathStyle', label: 'Force path-style URLs', type: 'checkbox' },
    ],
    workflow:
      'Fill in the bucket connection fields and connect. Lumio validates access before enabling browse, import, and sync.',
  },
  webdav: {
    title: 'WebDAV storage',
    description: 'Use a Nextcloud or WebDAV-compatible directory for statement and receipt file exchange.',
    statusPath: '/integrations/webdav/status',
    settingsPath: '/integrations/webdav/settings',
    disconnectPath: '/integrations/webdav',
    icon: <CloudQueueOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />,
    filesPath: '/integrations/webdav/files',
    importPath: '/integrations/webdav/import',
    syncPath: '/integrations/webdav/sync',
    fields: [
      {
        name: 'url',
        label: 'WebDAV URL',
        placeholder: 'https://cloud.example.com/remote.php/dav/files/user',
        required: true,
      },
      { name: 'rootPath', label: 'Root path', placeholder: '/' },
      { name: 'username', label: 'Username' },
      { name: 'password', label: 'Password', type: 'password' },
    ],
    workflow:
      'Fill in the WebDAV connection fields and connect. Lumio validates the directory before enabling browse, import, and sync.',
  },
  imap: {
    title: 'IMAP inbox',
    description:
      'Poll a generic IMAP mailbox for receipts, invoices, and attachments instead of depending on Gmail APIs.',
    statusPath: '/integrations/imap/status',
    settingsPath: '/integrations/imap/settings',
    disconnectPath: '/integrations/imap',
    icon: <MarkEmailUnreadOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />,
    syncPath: '/integrations/imap/sync',
    fields: [
      { name: 'host', label: 'Host', placeholder: 'imap.example.com', required: true },
      { name: 'port', label: 'Port', type: 'number', placeholder: '993' },
      { name: 'mailbox', label: 'Mailbox', placeholder: 'INBOX' },
      { name: 'user', label: 'Username', required: true },
      { name: 'pass', label: 'Password', type: 'password', required: true },
      { name: 'secure', label: 'Use TLS', type: 'checkbox' },
    ],
    workflow:
      'Fill in mailbox credentials and connect. Lumio validates IMAP access before polling unseen mail and importing receipt attachments.',
  },
  smtp: {
    title: 'SMTP email',
    description: 'Send workspace invitations through any SMTP-compatible mail server.',
    statusPath: '/settings/email/smtp',
    settingsPath: '/settings/email/smtp',
    settingsMethod: 'put',
    disconnectPath: '/settings/email/smtp',
    icon: <AlternateEmailOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />,
    workflow:
      'Enter SMTP connection details and save to verify the transport. Existing passwords stay encrypted when the password field is left blank.',
    fields: [
      { name: 'host', label: 'Host', placeholder: 'mail.example.com', required: true },
      { name: 'port', label: 'Port', type: 'number', placeholder: '587', required: true },
      { name: 'secure', label: 'Use TLS', type: 'checkbox' },
      { name: 'user', label: 'Username', placeholder: 'lumio@example.com' },
      { name: 'pass', label: 'Password', type: 'password' },
      { name: 'from', label: 'From', placeholder: 'Lumio <noreply@example.com>', required: true },
      { name: 'replyTo', label: 'Reply-To', placeholder: 'support@example.com' },
      { name: 'timeoutMs', label: 'Timeout, ms', type: 'number', placeholder: '10000' },
    ],
  },
  aiCompatible: {
    title: 'AI-compatible endpoint',
    description:
      'Use an OpenAI-compatible local or self-hosted backend such as Ollama, LocalAI, or vLLM.',
    statusPath: '/settings/integrations/ai',
    settingsPath: '/settings/integrations/ai',
    settingsMethod: 'put',
    disconnectPath: '/settings/integrations/ai',
    icon: <SmartToyOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />,
    workflow:
      'Fill in the endpoint and model, then save to validate a JSON chat completion request. Secrets are stored encrypted and are never returned to the browser.',
    fields: [
      { name: 'enabled', label: 'Enabled', type: 'checkbox' },
      { name: 'baseUrl', label: 'Base URL', placeholder: 'http://localhost:11434', required: true },
      { name: 'model', label: 'Model', placeholder: 'llama3.1', required: true },
      { name: 'apiKey', label: 'API key', type: 'password', placeholder: 'Optional for local backends' },
      { name: 'timeoutMs', label: 'Timeout, ms', type: 'number', placeholder: '20000' },
    ],
  },
  telegram: {
    title: 'Telegram',
    description: 'Connect a bot for reports and notification delivery.',
    statusPath: '/settings/notifications/telegram',
    settingsPath: '/settings/notifications/telegram',
    settingsMethod: 'put',
    disconnectPath: '/settings/notifications/telegram',
    icon: <TelegramIcon sx={{ fontSize: 24 }} aria-hidden="true" />,
    workflow:
      'Enter the workspace Telegram bot token and connect. The token is encrypted and used for reports and notification delivery.',
    fields: [
      { name: 'botToken', label: 'Bot token', type: 'password', placeholder: '123456:ABC...' },
      { name: 'timeoutMs', label: 'Timeout, ms', type: 'number', placeholder: '10000' },
    ],
  },
  appUrl: {
    title: 'Application URL',
    description: 'Set the public URL used in invitations, shared links, and generated callbacks.',
    statusPath: '/settings/app',
    settingsPath: '/settings/app',
    settingsMethod: 'put',
    disconnectPath: '/settings/app',
    icon: <LinkOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />,
    workflow:
      'Enter the externally reachable frontend URL. The backend normalizes it to an origin and uses it before any server env fallback.',
    fields: [
      {
        name: 'publicUrl',
        label: 'Public URL',
        placeholder: 'https://app.example.com',
        required: true,
      },
    ],
  },
};

interface OnboardingIntegrationConnectionProps {
  integrationKey: OnboardingIntegrationKey;
  onConnectionStatusChange: (connected: boolean) => void | Promise<void>;
}

export function OnboardingIntegrationConnection({
  integrationKey,
  onConnectionStatusChange,
}: OnboardingIntegrationConnectionProps): React.JSX.Element {
  return (
    <ProtocolIntegrationPage
      {...INTEGRATION_CONNECTION_CONFIGS[integrationKey]}
      embedded
      onConnectionStatusChange={onConnectionStatusChange}
    />
  );
}
