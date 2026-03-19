'use client';

import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { getChooserDocName, pickDropboxFiles } from '@/app/lib/dropboxChooser';
import { RefreshCcw, Settings, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type DropboxSettings = {
  folderId?: string | null;
  folderName?: string | null;
  syncEnabled?: boolean;
  syncTime?: string;
  timeZone?: string | null;
  lastSyncAt?: string | null;
};

type DropboxStatus = {
  connected: boolean;
  status: 'connected' | 'disconnected' | 'needs_reauth';
  settings?: DropboxSettings | null;
};

const MIME_TYPES = [
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const formatDateTime = (value?: string | null, locale?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale || 'ru', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export function DropboxStorageWidget({ locale }: { locale?: string }) {
  const t = useIntlayer('storagePage');
  const [status, setStatus] = useState<DropboxStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY || '';

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/integrations/dropbox/status');
      setStatus(response.data);
    } catch (error) {
      toast.error(t.dropboxSync?.errors?.loadStatus?.value || 'Failed to load Dropbox status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleConnect = async () => {
    try {
      const response = await apiClient.get('/integrations/dropbox/connect');
      const url = response.data?.url;
      if (!url) {
        toast.error(t.dropboxSync?.errors?.connectFailed?.value || 'Failed to connect to Dropbox');
        return;
      }
      window.location.href = url;
    } catch (error) {
      toast.error(t.dropboxSync?.errors?.connectFailed?.value || 'Failed to connect to Dropbox');
    }
  };

  const handleSyncNow = async () => {
    try {
      setWorking(true);
      await apiClient.post('/integrations/dropbox/sync');
      toast.success(t.dropboxSync?.toasts?.syncStarted?.value || 'Sync started');
      await loadStatus();
    } catch (error) {
      toast.error(t.dropboxSync?.errors?.syncFailed?.value || 'Sync failed');
    } finally {
      setWorking(false);
    }
  };

  const handleImport = async () => {
    if (!appKey) {
      toast.error(t.dropboxSync?.errors?.pickerUnavailable?.value || 'Dropbox picker unavailable');
      return;
    }
    try {
      setWorking(true);
      const docs = await pickDropboxFiles({
        appKey,
        mimeTypes: MIME_TYPES,
      });
      if (!docs.length) return;
      const fileIds = docs.map(doc => doc.id);
      const importResp = await apiClient.post('/integrations/dropbox/import', { fileIds });
      const results = importResp.data?.results || [];
      const successCount = results.filter((item: any) => item.status === 'ok').length;
      const failed = results.filter((item: any) => item.status === 'error');
      if (successCount > 0) {
        toast.success(
          t.dropboxSync?.toasts?.imported?.value?.replace('{count}', String(successCount)) ||
            `${successCount} files imported`,
        );
      }
      if (failed.length > 0) {
        const names = docs
          .filter(doc => failed.find((f: any) => f.fileId === doc.id))
          .map(doc => getChooserDocName(doc))
          .filter(Boolean)
          .join(', ');
        toast.error(
          t.dropboxSync?.errors?.importFailed?.value?.replace('{files}', names || 'Dropbox') ||
            `Failed to import ${names || 'files'}`,
        );
      }
      await loadStatus();
    } catch (error) {
      toast.error(
        t.dropboxSync?.errors?.importFailed?.value?.replace('{files}', 'Dropbox') ||
          'Import failed',
      );
    } finally {
      setWorking(false);
    }
  };

  const statusLabel =
    status?.status === 'needs_reauth'
      ? t.dropboxSync?.status?.needsReauth || 'Needs re-authentication'
      : status?.connected
        ? t.dropboxSync?.status?.connected || 'Connected'
        : t.dropboxSync?.status?.disconnected || 'Disconnected';

  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <Image src="/icons/dropbox-icon.png" alt="Dropbox" width={20} height={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              {t.dropboxSync?.title || 'Dropbox Sync'}
            </p>
            <p className="font-semibold text-gray-900 dark:text-white">{statusLabel}</p>
            <p className="text-xs text-gray-500 dark:text-gray-300">
              {loading
                ? t.dropboxSync?.loading || 'Loading...'
                : (t.dropboxSync?.lastSync?.value || 'Last sync: {time}').replace(
                    '{time}',
                    formatDateTime(status?.settings?.lastSyncAt, locale) || '—',
                  )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {status?.connected ? (
            <>
              <button
                type="button"
                onClick={handleImport}
                disabled={working}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                <UploadCloud className="h-4 w-4" />
                {t.dropboxSync?.actions?.import || 'Import'}
              </button>
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={working}
                className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                <RefreshCcw className="h-4 w-4" />
                {t.dropboxSync?.actions?.syncNow || 'Sync Now'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={working}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              <RefreshCcw className="h-4 w-4" />
              {t.dropboxSync?.actions?.connect || 'Connect'}
            </button>
          )}
          <Link
            href="/integrations/dropbox"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Settings className="h-4 w-4" />
            {t.dropboxSync?.actions?.settings || 'Settings'}
          </Link>
        </div>
      </div>
    </div>
  );
}
