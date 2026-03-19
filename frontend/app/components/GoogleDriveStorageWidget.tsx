'use client';

import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { getPickerDocName, pickDriveFiles } from '@/app/lib/googleDrivePicker';
import { RefreshCcw, Settings, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type DriveSettings = {
  folderId?: string | null;
  folderName?: string | null;
  syncEnabled?: boolean;
  syncTime?: string;
  timeZone?: string | null;
  lastSyncAt?: string | null;
};

type DriveStatus = {
  connected: boolean;
  status: 'connected' | 'disconnected' | 'needs_reauth';
  settings?: DriveSettings | null;
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

export function GoogleDriveStorageWidget({ locale }: { locale?: string }) {
  const t = useIntlayer('storagePage');
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY || '';

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/integrations/google-drive/status');
      setStatus(response.data);
    } catch (error) {
      toast.error(t.driveSync.errors.loadStatus.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleConnect = async () => {
    try {
      const response = await apiClient.get('/integrations/google-drive/connect');
      const url = response.data?.url;
      if (!url) {
        toast.error(t.driveSync.errors.connectFailed.value);
        return;
      }
      window.location.href = url;
    } catch (error) {
      toast.error(t.driveSync.errors.connectFailed.value);
    }
  };

  const handleSyncNow = async () => {
    try {
      setWorking(true);
      await apiClient.post('/integrations/google-drive/sync');
      toast.success(t.driveSync.toasts.syncStarted.value);
      await loadStatus();
    } catch (error) {
      toast.error(t.driveSync.errors.syncFailed.value);
    } finally {
      setWorking(false);
    }
  };

  const handleImport = async () => {
    if (!apiKey) {
      toast.error(t.driveSync.errors.pickerUnavailable.value);
      return;
    }
    try {
      setWorking(true);
      const tokenResp = await apiClient.get('/integrations/google-drive/picker-token');
      const accessToken = tokenResp.data?.accessToken;
      if (!accessToken) {
        toast.error(t.driveSync.errors.pickerUnavailable.value);
        return;
      }
      const docs = await pickDriveFiles({
        accessToken,
        apiKey,
        mimeTypes: MIME_TYPES,
      });
      if (!docs.length) return;
      const fileIds = docs.map(doc => doc.id);
      const importResp = await apiClient.post('/integrations/google-drive/import', { fileIds });
      const results = importResp.data?.results || [];
      const successCount = results.filter((item: any) => item.status === 'ok').length;
      const failed = results.filter((item: any) => item.status === 'error');
      if (successCount > 0) {
        toast.success(t.driveSync.toasts.imported.value.replace('{count}', String(successCount)));
      }
      if (failed.length > 0) {
        const names = docs
          .filter(doc => failed.find((f: any) => f.fileId === doc.id))
          .map(doc => getPickerDocName(doc))
          .filter(Boolean)
          .join(', ');
        toast.error(t.driveSync.errors.importFailed.value.replace('{files}', names || 'Drive'));
      }
      await loadStatus();
    } catch (error) {
      toast.error(t.driveSync.errors.importFailed.value.replace('{files}', 'Drive'));
    } finally {
      setWorking(false);
    }
  };

  const statusLabel =
    status?.status === 'needs_reauth'
      ? t.driveSync.status.needsReauth
      : status?.connected
        ? t.driveSync.status.connected
        : t.driveSync.status.disconnected;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <Image src="/icons/google-drive-icon.png" alt="Google Drive" width={20} height={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-300">{t.driveSync.title}</p>
            <p className="font-semibold text-gray-900 dark:text-white">{statusLabel}</p>
            <p className="text-xs text-gray-500 dark:text-gray-300">
              {loading
                ? t.driveSync.loading
                : t.driveSync.lastSync.value.replace(
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
                {t.driveSync.actions.import}
              </button>
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={working}
                className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                <RefreshCcw className="h-4 w-4" />
                {t.driveSync.actions.syncNow}
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
              {t.driveSync.actions.connect}
            </button>
          )}
          <Link
            href="/integrations/google-drive"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Settings className="h-4 w-4" />
            {t.driveSync.actions.settings}
          </Link>
        </div>
      </div>
    </div>
  );
}
