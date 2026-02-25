'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { useAuth } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import { getPickerDocName, pickDriveFolder } from '@/app/lib/googleDrivePicker';
import { AlertCircle, CheckCircle2, Link2Off, Loader2, RefreshCcw, XCircle } from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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

const formatDateTime = (value?: string | null, locale?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale || 'ru', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function GoogleDriveIntegrationPage() {
  const { user, loading: authLoading } = useAuth();
  const t = useIntlayer('googleDriveIntegrationPage');
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY || '';

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/integrations/google-drive/status');
      setStatus(response.data);
    } catch (error) {
      toast.error(t.errors.loadStatus.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadStatus();
    }
  }, [user]);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'connected') {
      toast.success(t.toasts.connected.value);
    }
    if (statusParam === 'error') {
      toast.error(t.errors.connectFailed.value);
    }
  }, [searchParams, t]);

  const handleConnect = async () => {
    try {
      toast.success(t.toasts.connecting.value);
      const response = await apiClient.get('/integrations/google-drive/connect');
      const url = response.data?.url;
      if (!url) {
        toast.error(t.errors.connectFailed.value);
        return;
      }
      window.location.href = url;
    } catch (error) {
      toast.error(t.errors.connectFailed.value);
    }
  };

  const handleDisconnect = async () => {
    try {
      setSaving(true);
      await apiClient.post('/integrations/google-drive/disconnect');
      toast.success(t.toasts.disconnected.value);
      await loadStatus();
    } catch (error) {
      toast.error(t.errors.disconnectFailed.value);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      await apiClient.post('/integrations/google-drive/sync');
      toast.success(t.toasts.syncStarted.value);
      await loadStatus();
    } catch (error) {
      toast.error(t.errors.connectFailed.value);
    } finally {
      setSyncing(false);
    }
  };

  const updateSettings = async (payload: Partial<DriveSettings>) => {
    try {
      setSaving(true);
      await apiClient.post('/integrations/google-drive/settings', payload);
      toast.success(t.toasts.settingsSaved.value);
      await loadStatus();
    } catch (error) {
      toast.error(t.errors.connectFailed.value);
    } finally {
      setSaving(false);
    }
  };

  const handlePickFolder = async () => {
    if (!apiKey) {
      toast.error(t.errors.pickerUnavailable.value);
      return;
    }
    try {
      const tokenResp = await apiClient.get('/integrations/google-drive/picker-token');
      const accessToken = tokenResp.data?.accessToken;
      if (!accessToken) {
        toast.error(t.errors.pickerUnavailable.value);
        return;
      }
      const folder = await pickDriveFolder({ accessToken, apiKey });
      if (!folder) return;
      await updateSettings({
        folderId: folder.id,
        folderName: getPickerDocName(folder),
      });
    } catch (error) {
      toast.error(t.errors.pickerUnavailable.value);
    }
  };

  const statusLabel = useMemo(() => {
    if (!status) return '';
    if (status.status === 'needs_reauth') return t.status.needsReauth.value;
    if (status.connected) return t.status.connected.value;
    return t.status.disconnected.value;
  }, [status, t]);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <p className="text-gray-800 font-semibold mb-2">{t.status.disconnected.value}</p>
          <p className="text-sm text-gray-600">{t.header.subtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-shared px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-start gap-3 mb-6">
        <div className="p-2 rounded-full bg-primary/10 text-primary">
          <Image src="/icons/google-drive-icon.png" alt="Google Drive" width={24} height={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.header.title}</h1>
          <p className="text-secondary mt-1">{t.header.subtitle}</p>
        </div>
      </div>

      {loading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка...
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {status?.connected ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="text-sm text-gray-500">{t.header.title}</p>
                  <p className="font-semibold text-gray-900">{statusLabel}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {status?.connected ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSyncNow}
                      disabled={syncing || saving}
                      className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                    >
                      {syncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="h-4 w-4" />
                      )}
                      {t.actions.syncNow}
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Link2Off className="h-4 w-4" />
                      {t.actions.disconnect}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {status?.status === 'needs_reauth' ? t.actions.reconnect : t.actions.connect}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t.settings.title}</h2>
              <button
                type="button"
                onClick={handlePickFolder}
                disabled={!status?.connected || saving}
                className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                {t.actions.pickFolder}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">{t.settings.folder}</p>
                <p className="font-medium text-gray-900">
                  {status?.settings?.folderName ||
                    status?.settings?.folderId ||
                    t.settings.folderPlaceholder}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">{t.settings.lastSync}</p>
                <p className="font-medium text-gray-900">
                  {formatDateTime(status?.settings?.lastSyncAt, user?.locale) || '—'}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">{t.settings.syncEnabled}</p>
                <div className="inline-flex items-center gap-2">
                  <Checkbox
                    checked={status?.settings?.syncEnabled ?? true}
                    onCheckedChange={checked => updateSettings({ syncEnabled: checked })}
                    disabled={!status?.connected || saving}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">
                    {status?.settings?.syncEnabled ? t.status.connected : t.status.disconnected}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">{t.settings.syncTime}</p>
                <input
                  type="time"
                  value={status?.settings?.syncTime || '03:00'}
                  onChange={e => updateSettings({ syncTime: e.target.value })}
                  disabled={!status?.connected || saving}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">{t.settings.timeZone}</p>
                <p className="font-medium text-gray-900">{status?.settings?.timeZone || 'UTC'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm h-fit">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-primary mt-1" />
            <div className="space-y-2 text-sm text-gray-600">
              <p>{t.settings.syncEnabled}</p>
              <p>{t.settings.folderPlaceholder}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
