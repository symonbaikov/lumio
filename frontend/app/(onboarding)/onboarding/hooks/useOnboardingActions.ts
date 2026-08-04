import { DEFAULT_BACKGROUND } from '@/app/(main)/workspaces/constants';
import {
  Bot,
  Cloud,
  Cpu,
  Database,
  Globe,
  Inbox,
  type LucideIcon,
  Mail,
} from '@/app/components/icons';
import type { User } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import { DEFAULT_CURRENCY } from '@/app/lib/format-money';
import { syncLocaleFromUser } from '@/app/lib/locale';
import { resolveOnboardingBootstrapLocale } from '../lib/locale-bootstrap';
import type { OnboardingData } from '../useOnboardingWizard';

export type OnboardingIntegrationKey =
  | 's3Compatible'
  | 'webdav'
  | 'imap'
  | 'smtp'
  | 'aiCompatible'
  | 'telegram'
  | 'appUrl';

type StatusResponse = {
  connected?: unknown;
  configured?: unknown;
  enabled?: unknown;
  status?: unknown;
};

type StatusName = 'connected' | 'configured';

const CONNECTED_STATUS_NAMES = new Set<StatusName>(['connected', 'configured']);

type StatusPath =
  | '/integrations/s3-compatible/status'
  | '/integrations/webdav/status'
  | '/integrations/imap/status'
  | '/settings/email/smtp'
  | '/settings/integrations/ai'
  | '/settings/notifications/telegram'
  | '/settings/app';

type IntegrationPath =
  | '/integrations/s3-compatible'
  | '/integrations/webdav'
  | '/integrations/imap'
  | '/integrations/smtp'
  | '/integrations/ai-compatible'
  | '/settings/telegram'
  | '/integrations/app-url';

export type OnboardingIntegration = {
  key: OnboardingIntegrationKey;
  titleFallback: string;
  descriptionFallback: string;
  path: IntegrationPath;
  statusPath: StatusPath;
  icon: LucideIcon;
};

export const ONBOARDING_INTEGRATIONS: OnboardingIntegration[] = [
  {
    key: 's3Compatible',
    titleFallback: 'S3-compatible storage',
    descriptionFallback: 'Connect MinIO or any S3-compatible bucket for imports and sync.',
    path: '/integrations/s3-compatible',
    statusPath: '/integrations/s3-compatible/status',
    icon: Database,
  },
  {
    key: 'webdav',
    titleFallback: 'WebDAV storage',
    descriptionFallback: 'Connect Nextcloud or another WebDAV-compatible file store.',
    path: '/integrations/webdav',
    statusPath: '/integrations/webdav/status',
    icon: Cloud,
  },
  {
    key: 'imap',
    titleFallback: 'IMAP inbox',
    descriptionFallback: 'Import receipts from any IMAP-compatible mailbox.',
    path: '/integrations/imap',
    statusPath: '/integrations/imap/status',
    icon: Inbox,
  },
  {
    key: 'smtp',
    titleFallback: 'SMTP email',
    descriptionFallback: 'Send invitations through any SMTP-compatible mail server.',
    path: '/integrations/smtp',
    statusPath: '/settings/email/smtp',
    icon: Mail,
  },
  {
    key: 'aiCompatible',
    titleFallback: 'AI-compatible endpoint',
    descriptionFallback: 'Use Ollama, LocalAI, vLLM, or another OpenAI-compatible backend.',
    path: '/integrations/ai-compatible',
    statusPath: '/settings/integrations/ai',
    icon: Cpu,
  },
  {
    key: 'telegram',
    titleFallback: 'Telegram',
    descriptionFallback: 'Connect a bot for reports and notification delivery.',
    path: '/settings/telegram',
    statusPath: '/settings/notifications/telegram',
    icon: Bot,
  },
  {
    key: 'appUrl',
    titleFallback: 'Application URL',
    descriptionFallback: 'Set the public URL used in invitation and sharing links.',
    path: '/integrations/app-url',
    statusPath: '/settings/app',
    icon: Globe,
  },
];

export const INTEGRATION_TITLE_FALLBACK: Record<OnboardingIntegrationKey, string> = {
  s3Compatible: 'S3-compatible storage',
  webdav: 'WebDAV storage',
  imap: 'IMAP inbox',
  smtp: 'SMTP email',
  aiCompatible: 'AI-compatible endpoint',
  telegram: 'Telegram',
  appUrl: 'Application URL',
};

export const INTEGRATION_DESCRIPTION_FALLBACK: Record<OnboardingIntegrationKey, string> = {
  s3Compatible: 'Connect MinIO or any S3-compatible bucket for imports and sync.',
  webdav: 'Connect Nextcloud or another WebDAV-compatible file store.',
  imap: 'Import receipts from any IMAP-compatible mailbox.',
  smtp: 'Send invitations through any SMTP-compatible mail server.',
  aiCompatible: 'Use Ollama, LocalAI, vLLM, or another OpenAI-compatible backend.',
  telegram: 'Connect a bot for reports and notification delivery.',
  appUrl: 'Set the public URL used in invitation and sharing links.',
};

export const EMPTY_INTEGRATION_STATE: Record<OnboardingIntegrationKey, boolean> = {
  s3Compatible: false,
  webdav: false,
  imap: false,
  smtp: false,
  aiCompatible: false,
  telegram: false,
  appUrl: false,
};

export function detectTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export function parseIntegrationConnectedStatus(data: unknown): boolean {
  const d = data as StatusResponse | null;
  const status = String(d?.status || '').toLowerCase() as StatusName;
  return (
    Boolean(d?.connected) ||
    Boolean(d?.configured) ||
    Boolean(d?.enabled) ||
    CONNECTED_STATUS_NAMES.has(status)
  );
}

export async function checkIntegrationConnected(
  integration: OnboardingIntegration,
): Promise<boolean> {
  const response = await apiClient.get(integration.statusPath);
  return parseIntegrationConnectedStatus(response.data);
}

async function checkOneIntegration(
  integration: OnboardingIntegration,
  nextStatuses: Record<OnboardingIntegrationKey, boolean>,
): Promise<void> {
  try {
    nextStatuses[integration.key] = await checkIntegrationConnected(integration);
  } catch {
    nextStatuses[integration.key] = false;
  }
}

export async function refreshAllIntegrationStatuses(): Promise<
  Record<OnboardingIntegrationKey, boolean>
> {
  const nextStatuses: Record<OnboardingIntegrationKey, boolean> = {
    ...EMPTY_INTEGRATION_STATE,
  };
  await Promise.all(
    ONBOARDING_INTEGRATIONS.map(integration => checkOneIntegration(integration, nextStatuses)),
  );
  return nextStatuses;
}

type WorkspaceItem = {
  id?: string;
  name?: string;
  currency?: string;
  backgroundImage?: string;
};

function extractWorkspaces(data: unknown): WorkspaceItem[] {
  if (Array.isArray(data)) {
    return data as WorkspaceItem[];
  }
  const d = data as { data?: unknown };
  if (Array.isArray(d?.data)) {
    return d.data as WorkspaceItem[];
  }
  return [];
}

type FetchWorkspaceParams = {
  userWorkspaceId: string | null | undefined;
  userLocale: string;
};

function applyWorkspaceToInitialData({
  workspace,
  initialData,
}: {
  workspace: WorkspaceItem | null;
  initialData: Partial<OnboardingData>;
}): void {
  if (workspace?.name) {
    initialData.workspaceName = workspace.name;
  }
  if (workspace?.currency) {
    initialData.workspaceCurrency = String(workspace.currency).toUpperCase();
  }
  if (workspace?.backgroundImage) {
    initialData.workspaceBackgroundImage = String(workspace.backgroundImage);
  }
}

export async function fetchWorkspaceInitialData({
  userWorkspaceId,
  userLocale,
}: FetchWorkspaceParams): Promise<Partial<OnboardingData>> {
  const resolvedLocale = resolveOnboardingBootstrapLocale(userLocale);

  const initialData: Partial<OnboardingData> = {
    locale: resolvedLocale,
    timeZone: detectTimeZone(),
    workspaceName: '',
    workspaceCurrency: DEFAULT_CURRENCY,
    workspaceBackgroundImage: DEFAULT_BACKGROUND,
  };

  const response = await apiClient.get('/workspaces');
  const workspaces = extractWorkspaces(response.data);
  const workspace = workspaces.find(item => item?.id === userWorkspaceId) ?? workspaces[0] ?? null;
  applyWorkspaceToInitialData({ workspace, initialData });

  return initialData;
}

type CompleteOnboardingParams = {
  data: OnboardingData;
  isCreateWorkspaceFlow: boolean;
  refreshWorkspaces: () => Promise<void>;
  setUser: (user: User | null) => void;
  onCreateWorkspaceDone: () => void;
  onOnboardingDone: () => void;
};

export async function completeOnboarding({
  data,
  isCreateWorkspaceFlow,
  refreshWorkspaces,
  setUser,
  onCreateWorkspaceDone,
  onOnboardingDone,
}: CompleteOnboardingParams): Promise<void> {
  const workspaceName = data.workspaceName.trim();
  const workspaceCurrency = data.workspaceCurrency.trim().toUpperCase();
  const workspaceBackgroundImage = (data.workspaceBackgroundImage || '').trim();

  if (isCreateWorkspaceFlow) {
    await runCreateWorkspaceFlow({
      data,
      workspaceName,
      workspaceCurrency,
      workspaceBackgroundImage,
      setUser,
      refreshWorkspaces,
    });
    onCreateWorkspaceDone();
    return;
  }

  await runMainOnboardingFlow({
    data,
    workspaceName,
    workspaceCurrency,
    workspaceBackgroundImage,
    setUser,
    refreshWorkspaces,
  });
  onOnboardingDone();
}

type FlowParams = {
  data: OnboardingData;
  workspaceName: string;
  workspaceCurrency: string;
  workspaceBackgroundImage: string;
  setUser: (user: User | null) => void;
  refreshWorkspaces: () => Promise<void>;
};

async function applyUserFromResponse({
  responseData,
  setUser,
}: {
  responseData: unknown;
  setUser: (user: User | null) => void;
}): Promise<void> {
  const d = responseData as { user?: unknown };
  const updatedUser = d?.user;
  if (updatedUser) {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    syncLocaleFromUser(updatedUser, { overwrite: true });
    setUser(updatedUser as User);
  }
}

async function runCreateWorkspaceFlow({
  data,
  workspaceName,
  workspaceCurrency,
  workspaceBackgroundImage,
  setUser,
  refreshWorkspaces,
}: FlowParams): Promise<void> {
  const prefsResp = await apiClient.patch('/users/me/preferences', {
    locale: data.locale,
    timeZone: data.timeZone || null,
  });
  await applyUserFromResponse({ responseData: prefsResp.data, setUser });

  const createResp = await apiClient.post('/workspaces', {
    name: workspaceName || 'New Workspace',
    currency: workspaceCurrency || undefined,
    backgroundImage: workspaceBackgroundImage || undefined,
  });
  const createdId = (createResp.data as { id?: string })?.id;
  if (createdId) {
    await apiClient.post(`/workspaces/${createdId}/switch`);
    localStorage.setItem('currentWorkspaceId', createdId);
  }

  try {
    await refreshWorkspaces();
  } catch {
    /* noop */
  }
}

async function runMainOnboardingFlow({
  data,
  workspaceName,
  workspaceCurrency,
  workspaceBackgroundImage,
  setUser,
  refreshWorkspaces,
}: FlowParams): Promise<void> {
  const response = await apiClient.patch('/users/me/onboarding', {
    locale: data.locale,
    timeZone: data.timeZone || null,
    workspaceName: workspaceName || undefined,
    workspaceCurrency: workspaceCurrency || undefined,
    workspaceBackgroundImage: workspaceBackgroundImage || undefined,
  });
  await applyUserFromResponse({ responseData: response.data, setUser });
  try {
    await refreshWorkspaces();
  } catch {
    /* noop */
  }
}

type IntegrationCard = {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  connected: boolean;
  loading: boolean;
  actionLabel: string;
};

type BuildCardsParams = {
  tx: (path: string[]) => string;
  integrationStatuses: Record<OnboardingIntegrationKey, boolean>;
  integrationLoading: Record<OnboardingIntegrationKey, boolean>;
};

function buildOneIntegrationCard({
  integration,
  tx,
  integrationStatuses,
  integrationLoading,
}: {
  integration: OnboardingIntegration;
  tx: (path: string[]) => string;
  integrationStatuses: Record<OnboardingIntegrationKey, boolean>;
  integrationLoading: Record<OnboardingIntegrationKey, boolean>;
}): IntegrationCard {
  const connected = integrationStatuses[integration.key];
  const title =
    tx(['integrations', 'cards', integration.key, 'title']) ||
    INTEGRATION_TITLE_FALLBACK[integration.key];
  const actionLabel = connected
    ? tx(['integrations', 'connectedBadge']) || 'Connected'
    : tx(['integrations', 'cards', integration.key, 'action']) || 'Connect';
  return {
    key: integration.key,
    title,
    description:
      tx(['integrations', 'cards', integration.key, 'description']) ||
      INTEGRATION_DESCRIPTION_FALLBACK[integration.key],
    icon: integration.icon,
    connected,
    loading: integrationLoading[integration.key],
    actionLabel,
  };
}

export function buildIntegrationCards({
  tx,
  integrationStatuses,
  integrationLoading,
}: BuildCardsParams): IntegrationCard[] {
  return ONBOARDING_INTEGRATIONS.map(integration =>
    buildOneIntegrationCard({ integration, tx, integrationStatuses, integrationLoading }),
  );
}
