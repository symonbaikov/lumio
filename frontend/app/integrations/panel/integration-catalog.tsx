import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import CloudQueueOutlinedIcon from '@mui/icons-material/CloudQueueOutlined';
import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import TelegramIcon from '@mui/icons-material/Telegram';
import type React from 'react';
import type {
  ConfigField,
  ConfigPreset,
  ProtocolIntegrationPageProps,
} from '../open-protocol-page';

export type IntegrationCategoryKey =
  | 'ai'
  | 'application'
  | 'storage'
  | 'email'
  | 'spreadsheets'
  | 'messaging';

type ProtocolConfig = Omit<ProtocolIntegrationPageProps, 'embedded' | 'onConnectionStatusChange'>;

/**
 * What the second layer shows for an entry: the shared protocol form, or a
 * panel of its own for the two entries that are not a credentials form.
 */
export type IntegrationDetail =
  | { kind: 'protocol'; config: ProtocolConfig; secondary?: ProtocolConfig }
  | { kind: 'local-categorization' }
  | { kind: 'workbook-import' };

export type IntegrationEntry = {
  key: string;
  name: string;
  description: string;
  badge: string;
  category: IntegrationCategoryKey;
  recommended: boolean;
  icon: React.ReactNode;
  /** Where the list reads the connected flag from; absent means no connection state. */
  statusPath?: string;
  docsUrl?: string;
  detail: IntegrationDetail;
};

/**
 * Every endpoint here is called as `<base URL>/v1/chat/completions`, except
 * api.anthropic.com which is routed through Anthropic's own protocol. Base URLs
 * carry no path of their own for that reason.
 */
const AI_PRESETS: ConfigPreset[] = [
  { label: 'OpenAI', values: { baseUrl: 'https://api.openai.com', model: 'gpt-4.1-mini' } },
  {
    label: 'Anthropic',
    values: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-5' },
  },
  {
    label: 'OpenRouter',
    values: { baseUrl: 'https://openrouter.ai/api', model: 'openai/gpt-4.1-mini' },
  },
];

const AI_FIELDS: ConfigField[] = [
  { name: 'enabled', label: 'Enabled', type: 'checkbox' },
  { name: 'baseUrl', label: 'Base URL', placeholder: 'https://api.openai.com', required: true },
  { name: 'model', label: 'Model', placeholder: 'gpt-4.1-mini', required: true },
  {
    name: 'apiKey',
    label: 'API key',
    type: 'password',
    placeholder: 'Optional for local backends',
  },
  { name: 'timeoutMs', label: 'Timeout, ms', type: 'number', placeholder: '20000' },
];

/**
 * The integrations offered in the panel, in list order. Each entry carries the
 * settings its second layer renders, so there is one place to add a service.
 */
export const INTEGRATION_CATALOG: IntegrationEntry[] = [
  {
    key: 'ai-compatible',
    name: 'AI-compatible endpoint',
    description: 'Use Ollama, LocalAI, vLLM, or another OpenAI-compatible backend.',
    badge: 'Open protocol',
    category: 'ai',
    recommended: true,
    icon: <SmartToyOutlinedIcon sx={{ fontSize: 22 }} aria-hidden="true" />,
    statusPath: '/settings/integrations/ai',
    docsUrl: 'https://github.com/ollama/ollama/blob/main/docs/api.md',
    detail: {
      kind: 'protocol',
      config: {
        title: 'AI-compatible endpoint',
        description:
          'Use a cloud provider such as OpenAI, Anthropic or OpenRouter, or an OpenAI-compatible self-hosted backend. Serves the whole workspace.',
        statusPath: '/settings/integrations/ai',
        settingsPath: '/settings/integrations/ai',
        settingsMethod: 'put',
        disconnectPath: '/settings/integrations/ai',
        icon: <SmartToyOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />,
        workflow:
          "Pick a preset or fill in the endpoint and model, then save to validate a chat completion request. A ChatGPT or Claude subscription does not include API access — create an API key on the provider's platform, which bills per token. Secrets are stored encrypted and are never returned to the browser.",
        fields: AI_FIELDS,
        presets: AI_PRESETS,
      },
      secondary: {
        title: 'Your own key',
        description:
          'Your personal provider credentials for chat mode. They take precedence over the workspace endpoint above, apply only to your chats in this workspace, and need no admin rights to set.',
        statusPath: '/settings/integrations/ai/personal',
        settingsPath: '/settings/integrations/ai/personal',
        settingsMethod: 'put',
        disconnectPath: '/settings/integrations/ai/personal',
        icon: <SmartToyOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />,
        workflow:
          'Chat mode resolves your key first and falls back to the workspace endpoint when this is empty or switched off. Usage is billed to your own provider account.',
        fields: AI_FIELDS,
        presets: AI_PRESETS,
      },
    },
  },
  {
    key: 'local-categorization',
    name: 'Local categorization',
    description: 'Install a local Transformers.js model for private receipt categorization.',
    badge: 'Local model',
    category: 'ai',
    recommended: true,
    icon: <CategoryOutlinedIcon sx={{ fontSize: 22 }} aria-hidden="true" />,
    statusPath: '/settings/local-categorization',
    detail: { kind: 'local-categorization' },
  },
  {
    key: 'smtp',
    name: 'SMTP email',
    description: 'Send invitations through any SMTP-compatible mail server.',
    badge: 'Open protocol',
    category: 'email',
    recommended: true,
    icon: <AlternateEmailOutlinedIcon sx={{ fontSize: 22 }} aria-hidden="true" />,
    statusPath: '/settings/email/smtp',
    docsUrl: 'https://datatracker.ietf.org/doc/html/rfc5321',
    detail: {
      kind: 'protocol',
      config: {
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
          {
            name: 'from',
            label: 'From',
            placeholder: 'Lumio <noreply@example.com>',
            required: true,
          },
          { name: 'replyTo', label: 'Reply-To', placeholder: 'support@example.com' },
          { name: 'timeoutMs', label: 'Timeout, ms', type: 'number', placeholder: '10000' },
        ],
      },
    },
  },
  {
    key: 'app-url',
    name: 'Application URL',
    description: 'Configure the public URL used in invitations and shared links.',
    badge: 'Workspace setting',
    category: 'application',
    recommended: true,
    icon: <LinkOutlinedIcon sx={{ fontSize: 22 }} aria-hidden="true" />,
    statusPath: '/settings/app',
    detail: {
      kind: 'protocol',
      config: {
        title: 'Application URL',
        description:
          'Set the public URL used in invitations, shared links, and generated callbacks.',
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
    },
  },
  {
    key: 's3-compatible',
    name: 'S3-compatible storage',
    description: 'Sync statements with an S3-compatible bucket such as MinIO.',
    badge: 'OSS protocol',
    category: 'storage',
    recommended: true,
    icon: <DnsOutlinedIcon sx={{ fontSize: 22 }} aria-hidden="true" />,
    statusPath: '/integrations/s3-compatible/status',
    docsUrl: 'https://min.io/docs/minio/linux/developers/javascript/API.html',
    detail: {
      kind: 'protocol',
      config: {
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
          {
            name: 'endpoint',
            label: 'Endpoint',
            placeholder: 'http://localhost:9000',
            required: true,
          },
          { name: 'region', label: 'Region', placeholder: 'us-east-1' },
          { name: 'bucket', label: 'Bucket', placeholder: 'lumio', required: true },
          { name: 'prefix', label: 'Prefix', placeholder: 'statements' },
          { name: 'accessKeyId', label: 'Access key ID', type: 'password' },
          { name: 'secretAccessKey', label: 'Secret access key', type: 'password' },
          { name: 'forcePathStyle', label: 'Force path-style URLs', type: 'checkbox' },
          { name: 'autoBackup', label: 'Auto-backup on upload', type: 'checkbox' },
        ],
        workflow:
          'Fill in the bucket connection fields and connect. Lumio validates access before enabling browse, import, and sync.',
      },
    },
  },
  {
    key: 'webdav',
    name: 'WebDAV storage',
    description: 'Import and sync files through WebDAV-compatible storage such as Nextcloud.',
    badge: 'Open protocol',
    category: 'storage',
    recommended: true,
    icon: <CloudQueueOutlinedIcon sx={{ fontSize: 22 }} aria-hidden="true" />,
    statusPath: '/integrations/webdav/status',
    docsUrl: 'https://datatracker.ietf.org/doc/html/rfc4918',
    detail: {
      kind: 'protocol',
      config: {
        title: 'WebDAV storage',
        description:
          'Use a Nextcloud or WebDAV-compatible directory for statement and receipt file exchange.',
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
    },
  },
  {
    key: 'imap',
    name: 'IMAP inbox',
    description: 'Poll any IMAP mailbox for receipts and invoice attachments.',
    badge: 'Open protocol',
    category: 'email',
    recommended: true,
    icon: <MarkEmailUnreadOutlinedIcon sx={{ fontSize: 22 }} aria-hidden="true" />,
    statusPath: '/integrations/imap/status',
    docsUrl: 'https://datatracker.ietf.org/doc/html/rfc9051',
    detail: {
      kind: 'protocol',
      config: {
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
          {
            name: 'mailbox',
            label: 'Mailbox',
            placeholder: 'INBOX',
            browseAction: {
              label: 'Browse folders',
              endpoint: '/integrations/imap/folders',
              dependsOn: ['host', 'port', 'secure', 'user', 'pass'],
            },
          },
          { name: 'user', label: 'Username', required: true },
          { name: 'pass', label: 'Password', type: 'password', required: true },
          { name: 'secure', label: 'Use TLS', type: 'checkbox' },
        ],
        workflow:
          'Fill in mailbox credentials and connect. Lumio validates IMAP access before polling unseen mail and importing receipt attachments.',
      },
    },
  },
  {
    key: 'workbook-import',
    name: 'Workbook and Google Sheets import',
    description: 'Import custom tables from XLSX, CSV, ODS, or a shared Google Sheets link.',
    badge: 'File based',
    category: 'spreadsheets',
    recommended: true,
    icon: <TableChartOutlinedIcon sx={{ fontSize: 22 }} aria-hidden="true" />,
    detail: { kind: 'workbook-import' },
  },
  {
    key: 'telegram',
    name: 'Telegram',
    description: 'Deliver reports and notifications through a workspace bot.',
    badge: 'Bot token',
    category: 'messaging',
    recommended: false,
    icon: <TelegramIcon sx={{ fontSize: 22 }} aria-hidden="true" />,
    statusPath: '/settings/notifications/telegram',
    docsUrl: 'https://core.telegram.org/bots',
    detail: {
      kind: 'protocol',
      config: {
        title: 'Telegram',
        description: 'Connect a bot for reports and notification delivery.',
        statusPath: '/settings/notifications/telegram',
        settingsPath: '/settings/notifications/telegram',
        settingsMethod: 'put',
        disconnectPath: '/settings/notifications/telegram',
        icon: <TelegramIcon sx={{ fontSize: 24 }} aria-hidden="true" />,
        workflow:
          'Enter the workspace Telegram bot token and connect. The token is encrypted and used for reports and notification delivery. Chat links and report history stay in notification settings.',
        fields: [
          { name: 'botToken', label: 'Bot token', type: 'password', placeholder: '123456:ABC...' },
          { name: 'timeoutMs', label: 'Timeout, ms', type: 'number', placeholder: '10000' },
        ],
      },
    },
  },
];

export function findIntegrationEntry(key: string | null): IntegrationEntry | undefined {
  return key ? INTEGRATION_CATALOG.find(entry => entry.key === key) : undefined;
}
