'use client';

import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined';
import CloudQueueOutlinedIcon from '@mui/icons-material/CloudQueueOutlined';
import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import TelegramIcon from '@mui/icons-material/Telegram';
import type React from 'react';
import { useIntlayer } from '@/app/i18n';
import {
  ProtocolIntegrationPage,
  type ProtocolIntegrationPageProps,
} from '@/app/integrations/open-protocol-page';
import type { OnboardingIntegrationKey } from '../hooks/useOnboardingActions';

type IntegrationConnectionConfig = Omit<
  ProtocolIntegrationPageProps,
  'embedded' | 'onConnectionStatusChange'
>;

type ConnectionText = ReturnType<typeof useIntlayer<'onboardingIntegrationConnection'>>;

const buildIntegrationConnectionConfigs = (
  t: ConnectionText,
): Record<OnboardingIntegrationKey, IntegrationConnectionConfig> => ({
  s3Compatible: {
    title: t.s3Compatible.title.value,
    description: t.s3Compatible.description.value,
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
        label: t.fields.endpoint.value,
        placeholder: 'http://localhost:9000',
        required: true,
      },
      { name: 'region', label: t.fields.region.value, placeholder: 'us-east-1' },
      { name: 'bucket', label: t.fields.bucket.value, placeholder: 'lumio', required: true },
      { name: 'prefix', label: t.fields.prefix.value, placeholder: 'statements' },
      { name: 'accessKeyId', label: t.fields.accessKeyId.value, type: 'password' },
      { name: 'secretAccessKey', label: t.fields.secretAccessKey.value, type: 'password' },
      { name: 'forcePathStyle', label: t.fields.forcePathStyle.value, type: 'checkbox' },
    ],
    workflow: t.s3Compatible.workflow.value,
  },
  webdav: {
    title: t.webdav.title.value,
    description: t.webdav.description.value,
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
        label: t.fields.webdavUrl.value,
        placeholder: 'https://cloud.example.com/remote.php/dav/files/user',
        required: true,
      },
      { name: 'rootPath', label: t.fields.rootPath.value, placeholder: '/' },
      { name: 'username', label: t.fields.username.value },
      { name: 'password', label: t.fields.password.value, type: 'password' },
    ],
    workflow: t.webdav.workflow.value,
  },
  imap: {
    title: t.imap.title.value,
    description: t.imap.description.value,
    statusPath: '/integrations/imap/status',
    settingsPath: '/integrations/imap/settings',
    disconnectPath: '/integrations/imap',
    icon: <MarkEmailUnreadOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />,
    syncPath: '/integrations/imap/sync',
    fields: [
      { name: 'host', label: t.fields.host.value, placeholder: 'imap.example.com', required: true },
      { name: 'port', label: t.fields.port.value, type: 'number', placeholder: '993' },
      { name: 'mailbox', label: t.fields.mailbox.value, placeholder: 'INBOX' },
      { name: 'user', label: t.fields.username.value, required: true },
      { name: 'pass', label: t.fields.password.value, type: 'password', required: true },
      { name: 'secure', label: t.fields.useTls.value, type: 'checkbox' },
    ],
    workflow: t.imap.workflow.value,
  },
  smtp: {
    title: t.smtp.title.value,
    description: t.smtp.description.value,
    statusPath: '/settings/email/smtp',
    settingsPath: '/settings/email/smtp',
    settingsMethod: 'put',
    disconnectPath: '/settings/email/smtp',
    icon: <AlternateEmailOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />,
    workflow: t.smtp.workflow.value,
    fields: [
      { name: 'host', label: t.fields.host.value, placeholder: 'mail.example.com', required: true },
      {
        name: 'port',
        label: t.fields.port.value,
        type: 'number',
        placeholder: '587',
        required: true,
      },
      { name: 'secure', label: t.fields.useTls.value, type: 'checkbox' },
      { name: 'user', label: t.fields.username.value, placeholder: 'lumio@example.com' },
      { name: 'pass', label: t.fields.password.value, type: 'password' },
      {
        name: 'from',
        label: t.fields.from.value,
        placeholder: 'Lumio <noreply@example.com>',
        required: true,
      },
      { name: 'replyTo', label: t.fields.replyTo.value, placeholder: 'support@example.com' },
      { name: 'timeoutMs', label: t.fields.timeoutMs.value, type: 'number', placeholder: '10000' },
    ],
  },
  aiCompatible: {
    title: t.aiCompatible.title.value,
    description: t.aiCompatible.description.value,
    statusPath: '/settings/integrations/ai',
    settingsPath: '/settings/integrations/ai',
    settingsMethod: 'put',
    disconnectPath: '/settings/integrations/ai',
    icon: <SmartToyOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />,
    workflow: t.aiCompatible.workflow.value,
    fields: [
      { name: 'enabled', label: t.fields.enabled.value, type: 'checkbox' },
      {
        name: 'baseUrl',
        label: t.fields.baseUrl.value,
        placeholder: 'http://localhost:11434',
        required: true,
      },
      { name: 'model', label: t.fields.model.value, placeholder: 'llama3.1', required: true },
      {
        name: 'apiKey',
        label: t.fields.apiKey.value,
        type: 'password',
        placeholder: t.fields.apiKeyPlaceholder.value,
      },
      { name: 'timeoutMs', label: t.fields.timeoutMs.value, type: 'number', placeholder: '20000' },
    ],
  },
  telegram: {
    title: 'Telegram',
    description: t.telegram.description.value,
    statusPath: '/settings/notifications/telegram',
    settingsPath: '/settings/notifications/telegram',
    settingsMethod: 'put',
    disconnectPath: '/settings/notifications/telegram',
    icon: <TelegramIcon sx={{ fontSize: 24 }} aria-hidden="true" />,
    workflow: t.telegram.workflow.value,
    fields: [
      {
        name: 'botToken',
        label: t.fields.botToken.value,
        type: 'password',
        placeholder: '123456:ABC...',
      },
      { name: 'timeoutMs', label: t.fields.timeoutMs.value, type: 'number', placeholder: '10000' },
    ],
  },
  appUrl: {
    title: t.appUrl.title.value,
    description: t.appUrl.description.value,
    statusPath: '/settings/app',
    settingsPath: '/settings/app',
    settingsMethod: 'put',
    disconnectPath: '/settings/app',
    icon: <LinkOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />,
    workflow: t.appUrl.workflow.value,
    fields: [
      {
        name: 'publicUrl',
        label: t.fields.publicUrl.value,
        placeholder: 'https://app.example.com',
        required: true,
      },
    ],
  },
});

interface OnboardingIntegrationConnectionProps {
  integrationKey: OnboardingIntegrationKey;
  onConnectionStatusChange: (connected: boolean) => void | Promise<void>;
}

export function OnboardingIntegrationConnection({
  integrationKey,
  onConnectionStatusChange,
}: OnboardingIntegrationConnectionProps): React.JSX.Element {
  const t = useIntlayer('onboardingIntegrationConnection');
  return (
    <ProtocolIntegrationPage
      {...buildIntegrationConnectionConfigs(t)[integrationKey]}
      embedded
      onConnectionStatusChange={onConnectionStatusChange}
    />
  );
}
