/**
 * Action handlers for StatementsSidePanel.
 */

import toast from 'react-hot-toast';
import apiClient from '@/app/lib/api';
import {
  type CloudImportProvider,
  type GmailSyncSkeletonMeta,
  STATEMENTS_GMAIL_SYNC_EVENT,
  STATEMENTS_GMAIL_SYNC_STORAGE_KEY,
} from '@/app/lib/statement-upload-actions';

const CLOUD_IMPORT_ENDPOINTS: Record<string, string> = {
  dropbox: '/integrations/dropbox/sync',
  'google-drive': '/integrations/google-drive/sync',
};

const CLOUD_IMPORT_LABELS: Record<string, { success: string; error: string }> = {
  dropbox: { success: 'Dropbox import started', error: 'Failed to import from Dropbox' },
  'google-drive': {
    success: 'Google Drive import started',
    error: 'Failed to import from Google Drive',
  },
};

export const executeCloudImport = async (
  provider: CloudImportProvider,
  navigateToSubmit: () => void,
): Promise<void> => {
  const endpoint = CLOUD_IMPORT_ENDPOINTS[provider] ?? '';
  const labels = CLOUD_IMPORT_LABELS[provider] ?? {
    success: 'Import started',
    error: 'Import failed',
  };
  try {
    await apiClient.post(endpoint);
    toast.success(labels.success);
    navigateToSubmit();
  } catch {
    toast.error(labels.error);
  }
};

export type GmailSyncResponse = {
  data?: {
    scanned?: unknown;
    imported?: unknown;
    messagesFound?: unknown;
    jobsCreated?: unknown;
    skipped?: unknown;
  };
};

type GmailSyncCounts = { messagesFound: number; jobsCreated: number; skipped: number };

type GmailSyncData = NonNullable<GmailSyncResponse['data']>;

const extractGmailCounts = (data: GmailSyncResponse['data']): GmailSyncCounts => {
  const d: GmailSyncData = data ?? {};
  return {
    messagesFound: Number(d.messagesFound ?? 0),
    jobsCreated: Number(d.jobsCreated ?? 0),
    skipped: Number(d.skipped ?? 0),
  };
};

const handleGmailJobsCreated = (jobsCreated: number, navigateToSubmit: () => void): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const payload: GmailSyncSkeletonMeta = { count: jobsCreated, timestamp: Date.now() };
  sessionStorage.setItem(STATEMENTS_GMAIL_SYNC_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(STATEMENTS_GMAIL_SYNC_EVENT, { detail: payload }));
  toast.success(`Inbox sync started (${jobsCreated} receipts)`);
  navigateToSubmit();
};

export const handleGmailSyncResponse = (
  response: GmailSyncResponse,
  navigateToSubmit: () => void,
): void => {
  const scanned = Number(response.data?.scanned ?? 0);
  const imported = Number(response.data?.imported ?? 0);
  if (imported > 0) {
    toast.success(`Inbox sync imported ${imported} receipt${imported === 1 ? '' : 's'}`);
    navigateToSubmit();
    return;
  }
  if ('scanned' in (response.data ?? {})) {
    if (scanned === 0) {
      toast.error('No unread emails found in IMAP inbox');
      return;
    }
    toast.error('No new receipt attachments found in IMAP inbox');
    navigateToSubmit();
    return;
  }

  const { messagesFound, jobsCreated, skipped } = extractGmailCounts(response.data);
  if (jobsCreated > 0) {
    handleGmailJobsCreated(jobsCreated, navigateToSubmit);
    return;
  }
  if (messagesFound === 0) {
    toast.error('No unread emails found in IMAP inbox');
    return;
  }
  if (skipped >= messagesFound) {
    toast.error('All receipts available in this inbox are already synced');
    return;
  }
  toast.error('Inbox sync finished with no new receipts');
  navigateToSubmit();
};
