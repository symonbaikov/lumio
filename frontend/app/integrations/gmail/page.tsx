'use client';

import { useAuth } from '@/app/hooks/useAuth';
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
      toast.error('Failed to load Gmail integration status');
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
      toast.success('Gmail connected successfully!');
    }
    if (statusParam === 'error') {
      const reason = searchParams.get('reason');
      toast.error(`Failed to connect Gmail${reason ? `: ${reason}` : ''}`);
    }
  }, [searchParams]);

  const handleConnect = async () => {
    try {
      toast.success('Connecting to Gmail...');
      const response = await apiClient.get('/integrations/gmail/connect');
      const url = response.data?.url;
      if (!url) {
        toast.error('Failed to get Gmail OAuth URL');
        return;
      }
      window.location.href = url;
    } catch (error) {
      toast.error('Failed to connect Gmail');
    }
  };

  const handleDisconnect = async () => {
    try {
      setSaving(true);
      await apiClient.post('/integrations/gmail/disconnect');
      toast.success('Gmail disconnected');
      await loadStatus();
    } catch (error) {
      toast.error('Failed to disconnect Gmail');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = async (payload: Partial<GmailSettings>) => {
    try {
      setSaving(true);
      await apiClient.post('/integrations/gmail/settings', payload);
      toast.success('Settings saved');
      await loadStatus();
    } catch (error) {
      toast.error('Failed to save settings');
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
        toast.success(`Gmail sync started (${jobsCreated} receipts)`);
      } else if (messagesFound === 0) {
        toast.error('No matching emails found in Gmail');
      } else if (messagesFound > 0 && skipped >= messagesFound) {
        toast.error('All receipts available in Gmail are already synced');
      } else {
        toast.error('Gmail sync finished with no new receipts');
      }

      await loadStatus();
    } catch (error) {
      toast.error('Failed to sync Gmail');
    } finally {
      setSyncing(false);
    }
  };

  const statusLabel = useMemo(() => {
    if (!status) return '';
    if (status.status === 'needs_reauth') return 'Needs Re-authentication';
    if (status.connected) return 'Connected';
    return 'Disconnected';
  }, [status]);

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
          <p className="text-gray-800 font-semibold mb-2">Not Connected</p>
          <p className="text-sm text-gray-600">Please sign in to connect Gmail</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-start gap-3 mb-6">
        <div className="p-2 rounded-full bg-blue-50 text-blue-600 overflow-hidden">
          <Image
            src="/icons/gmail.png"
            alt="Gmail"
            width={24}
            height={24}
            className="h-6 w-6 object-contain"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gmail Integration</h1>
          <p className="text-gray-600 mt-1">
            Connect Gmail to automatically import receipts and invoices
          </p>
        </div>
      </div>

      {loading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Connection Status Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {status?.connected ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-semibold text-gray-900">{statusLabel}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {status?.connected ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSync}
                      disabled={saving || syncing}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {syncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="h-4 w-4" />
                      )}
                      Sync Gmail
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
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                    {status?.status === 'needs_reauth' ? 'Reconnect' : 'Connect Gmail'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Settings Card */}
          {status?.connected && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>

              <div className="space-y-4">
                {/* Label Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Label Name</p>
                    <p className="font-medium text-gray-900">
                      {status.settings?.labelName || 'Lumio/Receipts'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Last Sync</p>
                    <p className="font-medium text-gray-900">
                      {formatDateTime(status.settings?.lastSyncAt, user?.locale) || '—'}
                    </p>
                  </div>
                </div>

                {/* Filter Settings */}
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={status.settings?.filterEnabled ?? true}
                      onChange={e => updateSettings({ filterEnabled: e.target.checked })}
                      disabled={saving}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Enable automatic filtering</span>
                  </label>
                </div>

                {/* Watch Status */}
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Watch Status</p>
                  <p className="font-medium text-gray-900">
                    {status.settings?.watchEnabled ? (
                      <span className="text-emerald-600">Active</span>
                    ) : (
                      <span className="text-gray-400">Inactive</span>
                    )}
                  </p>
                  {status.settings?.watchExpiration && (
                    <p className="text-xs text-gray-500">
                      Expires: {formatDateTime(status.settings.watchExpiration, user?.locale)}
                    </p>
                  )}
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <label htmlFor="gmail-filter-keywords" className="text-sm text-gray-500">
                    Filter Keywords
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
                    placeholder="receipt, invoice, order confirmation"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-xs text-gray-500">Comma-separated keywords to filter emails</p>
                </div>

                {/* Has Attachment Filter */}
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={status.settings?.filterConfig?.hasAttachment ?? true}
                      onChange={e =>
                        updateSettings({
                          filterConfig: {
                            ...status.settings?.filterConfig,
                            hasAttachment: e.target.checked,
                          },
                        })
                      }
                      disabled={saving}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Only emails with attachments</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm h-fit">
          <h3 className="font-semibold text-gray-900 mb-2">How it works</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>1. Connect your Gmail account with read-only access</p>
            <p>2. We automatically create a "Lumio/Receipts" label</p>
            <p>3. Emails matching your filters are automatically imported</p>
            <p>4. Review and approve receipts in the Receipts page</p>
          </div>
        </div>
      </div>
    </div>
  );
}
