'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { CheckCircle2, Link2Off, Loader2, RefreshCcw, XCircle } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

type GmailSettings = {
  labelId?: string | null;
  labelName?: string;
  filterEnabled?: boolean;
  filterConfig?: {
    subjects?: string[];
    senders?: string[];
    hasAttachment?: boolean;
    keywords?: string[];
  };
  watchEnabled?: boolean;
  watchExpiration?: string | null;
  lastSyncAt?: string | null;
  historyId?: string | null;
};

type GmailStatus = {
  connected: boolean;
  status: 'connected' | 'disconnected' | 'needs_reauth';
  settings?: GmailSettings | null;
  scopes?: string[];
};

const formatDateTime = (value?: string | null, locale?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale || 'en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function GmailIntegrationPage() {
  const { user, loading: authLoading } = useAuth();
  const t = useIntlayer('gmailIntegrationPage' as any) as any;
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/integrations/gmail/status');
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
    if (statusParam === 'success') {
      toast.success(t.toasts.connected.value);
    }
    if (statusParam === 'error') {
      const reason = searchParams.get('reason');
      toast.error(reason ? `${t.errors.authFailed.value}: ${reason}` : t.errors.authFailed.value);
    }
  }, [searchParams, t]);

  const handleConnect = async () => {
    try {
      toast.success(t.toasts.connecting.value);
      const response = await apiClient.get('/integrations/gmail/connect');
      const url = response.data?.url;
      if (!url) {
        toast.error(t.errors.missingOauthUrl.value);
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
      await apiClient.post('/integrations/gmail/disconnect');
      toast.success(t.toasts.disconnected.value);
      await loadStatus();
    } catch (error) {
      toast.error(t.errors.disconnectFailed.value);
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = async (payload: Partial<GmailSettings>) => {
    try {
      setSaving(true);
      await apiClient.post('/integrations/gmail/settings', payload);
      toast.success(t.toasts.settingsSaved.value);
      await loadStatus();
    } catch (error) {
      toast.error(t.errors.saveFailed.value);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await apiClient.post('/integrations/gmail/sync');
      const messagesFound = Number(response.data?.messagesFound ?? 0);
      const jobsCreated = Number(response.data?.jobsCreated ?? 0);
      const skipped = Number(response.data?.skipped ?? 0);

      if (jobsCreated > 0) {
        toast.success(`${t.toasts.syncStarted.value} (${jobsCreated})`);
      } else if (messagesFound === 0) {
        toast.error(t.errors.noMatches.value);
      } else if (messagesFound > 0 && skipped >= messagesFound) {
        toast.error(t.errors.allSynced.value);
      } else {
        toast.error(t.errors.syncNoNew.value);
      }

      await loadStatus();
    } catch (error) {
      toast.error(t.errors.syncFailed.value);
    } finally {
      setSyncing(false);
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
          <p className="text-gray-800 font-semibold mb-2">{t.common.notConnected.value}</p>
          <p className="text-sm text-gray-600">{t.errors.loginRequired.value}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-shared px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-start gap-3 mb-6">
        <div className="p-2 rounded-full bg-primary/10 text-primary overflow-hidden">
          <Image
            src="/icons/gmail.png"
            alt="Gmail"
            width={24}
            height={24}
            className="h-6 w-6 object-contain"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.header.title.value}</h1>
          <p className="text-gray-600 mt-1">{t.header.subtitle.value}</p>
        </div>
      </div>

      {loading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.common.loading.value}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {status?.connected ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t.header.title.value}</h2>
                  <p className="text-sm text-gray-500">{statusLabel}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap gap-2">
                  {status?.connected ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSync}
                        disabled={saving || syncing}
                        className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                      >
                        {syncing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCcw className="h-4 w-4" />
                        )}
                        {t.actions.sync.value}
                      </button>
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Link2Off className="h-4 w-4" />
                        )}
                        {t.actions.disconnect.value}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnect}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="h-4 w-4" />
                      )}
                      {status?.status === 'needs_reauth'
                        ? t.actions.reconnect.value
                        : t.actions.connect.value}
                    </button>
                  )}
                </div>
                {!status?.connected && (
                  <p className="text-xs text-gray-500 max-w-xs text-right mt-1">
                    We’ll create a label in your Gmail and sync new receipts automatically.
                  </p>
                )}
              </div>
            </div>
          </div>

          {status?.connected && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">{t.settings.title.value}</h2>

              <div className="space-y-4">
                {/* Label Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">{t.settings.labelName.value}</p>
                    <p className="font-medium text-gray-900">
                      {status.settings?.labelName || 'Lumio/Receipts'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">{t.settings.lastSync.value}</p>
                    <p className="font-medium text-gray-900">
                      {formatDateTime(status.settings?.lastSyncAt, user?.locale) ||
                        t.common.unknownDate.value}
                    </p>
                  </div>
                </div>

                {/* Filter Settings */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2">
                    <Checkbox
                      checked={status.settings?.filterEnabled ?? true}
                      onCheckedChange={checked => updateSettings({ filterEnabled: checked })}
                      disabled={saving}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{t.settings.filterEnabled.value}</span>
                  </div>
                </div>

                {/* Watch Status */}
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">{t.settings.watchStatus.value}</p>
                  <p className="font-medium text-gray-900">
                    {status.settings?.watchEnabled ? (
                      <span className="text-emerald-600">{t.status.active.value}</span>
                    ) : (
                      <span className="text-gray-400">{t.status.inactive.value}</span>
                    )}
                  </p>
                  {status.settings?.watchExpiration && (
                    <p className="text-xs text-gray-500">
                      {t.settings.expires.value}:{' '}
                      {formatDateTime(status.settings.watchExpiration, user?.locale)}
                    </p>
                  )}
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <label htmlFor="gmail-filter-keywords" className="text-sm text-gray-500">
                    {t.settings.keywords.value}
                  </label>
                  <input
                    id="gmail-filter-keywords"
                    type="text"
                    value={status.settings?.filterConfig?.keywords?.join(', ') || ''}
                    onChange={e =>
                      updateSettings({
                        filterConfig: {
                          ...status.settings?.filterConfig,
                          keywords: e.target.value.split(',').map(k => k.trim()),
                        },
                      })
                    }
                    disabled={saving}
                    placeholder={t.settings.keywordsPlaceholder.value}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-xs text-gray-500">{t.settings.keywordsHelp.value}</p>
                </div>

                {/* Has Attachment Filter */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2">
                    <Checkbox
                      checked={status.settings?.filterConfig?.hasAttachment ?? true}
                      onCheckedChange={checked =>
                        updateSettings({
                          filterConfig: {
                            ...status.settings?.filterConfig,
                            hasAttachment: checked,
                          },
                        })
                      }
                      disabled={saving}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{t.settings.hasAttachment.value}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm h-fit">
          <div className="flex items-start gap-2">
            <div className="mt-1 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{t.info.title.value}</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>{t.info.step1.value}</p>
                <p>{t.info.step2.value}</p>
                <p>{t.info.step3.value}</p>
                <p>{t.info.step4.value}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
