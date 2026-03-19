'use client';

import { useIntlayer, useLocale } from '@/app/i18n';
import { resolveBankLogo } from '@bank-logos';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Loader2,
  RefreshCcw,
  Share2,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import LoadingAnimation from '../../components/LoadingAnimation';
import PermissionsPanel from '../../components/PermissionsPanel';
import ShareDialog from '../../components/ShareDialog';
import TransactionsView from '../../components/TransactionsView';
import api from '../../lib/api';

type FileAvailabilityStatus = 'both' | 'disk' | 'db' | 'missing';

type FileAvailability = {
  onDisk: boolean;
  inDb: boolean;
  status: FileAvailabilityStatus;
};

interface StatementCategory {
  id: string;
  name: string;
  color?: string;
}

interface StatementDetails {
  id: string;
  fileName: string;
  bankName: string;
  status: string;
  fileSize: number;
  createdAt: string;
  metadata?: {
    accountNumber?: string;
  };
  category?: StatementCategory | null;
  categoryId?: string | null;
}

interface FileDetails {
  statement: StatementDetails;
  transactions: any[];
  sharedLinks: any[];
  permissions: any[];
  isOwner: boolean;
  userPermission?: string;
  fileAvailability?: FileAvailability;
}

const getBankDisplayName = (bankName: string) => {
  const resolved = resolveBankLogo(bankName);
  if (!resolved) return bankName;
  return resolved.key !== 'other' ? resolved.displayName : bankName;
};

/**
 * File details page with transactions, sharing, and permissions
 */
export default function FileDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileId = params.id as string;
  const initialTab = searchParams.get('tab') || 'transactions';
  const t = useIntlayer('storageDetailsPage');
  const { locale } = useLocale();

  const [details, setDetails] = useState<FileDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'transactions' | 'links' | 'permissions'>(
    initialTab === 'permissions'
      ? 'permissions'
      : initialTab === 'share'
        ? 'links'
        : 'transactions',
  );
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const revokePreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const loadedDetails = await loadFileDetails();
      if (cancelled) return;

      if (loadedDetails?.fileAvailability?.status === 'missing') {
        setPreviewError(t.preview.unavailable.value);
        revokePreviewUrl();
        setPreviewUrl(null);
        setPreviewLoading(false);
        return;
      }

      await loadPreview(loadedDetails?.fileAvailability?.status);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [fileId]);

  useEffect(() => {
    return () => {
      revokePreviewUrl();
    };
  }, []);

  const loadFileDetails = async (): Promise<FileDetails | null> => {
    try {
      setLoading(true);
      const response = await api.get(`/storage/files/${fileId}`);
      setDetails(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to load file details:', error);
      setDetails(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async (availabilityStatusOverride?: FileAvailabilityStatus) => {
    const availabilityStatus = availabilityStatusOverride ?? details?.fileAvailability?.status;
    if (availabilityStatus === 'missing') {
      setPreviewError(t.preview.unavailable.value);
      revokePreviewUrl();
      setPreviewUrl(null);
      setPreviewLoading(false);
      return;
    }

    try {
      setPreviewLoading(true);
      setPreviewError(null);
      revokePreviewUrl();
      setPreviewUrl(null);

      const response = await api.get(`/storage/files/${fileId}/view`, {
        responseType: 'blob',
      });

      const url = URL.createObjectURL(response.data);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch (error) {
      console.error('Failed to load file preview:', error);
      const statusCode = (error as any)?.response?.status;
      const backendMessage =
        (error as any)?.response?.data?.error?.message || (error as any)?.response?.data?.message;

      const message =
        statusCode === 404
          ? t.preview.unavailable.value
          : backendMessage || t.toasts.previewFailed.value;
      setPreviewError(message);
      setPreviewUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!details) return;

    try {
      const response = await api.get(`/storage/files/${fileId}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', details.statement.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(
      locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPermissionLabel = (permission?: string | null) => {
    switch ((permission || '').toLowerCase()) {
      case 'owner':
        return t.permission.owner.value;
      case 'editor':
        return t.permission.editor.value;
      case 'viewer':
        return t.permission.viewer.value;
      case 'downloader':
        return t.permission.downloader.value;
      default:
        return t.permission.access.value;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return t.status.completed.value;
      case 'processing':
        return t.status.processing.value;
      case 'error':
        return t.status.error.value;
      case 'uploaded':
        return t.status.uploaded.value;
      default:
        return status;
    }
  };

  const getAvailabilityLabel = (status: FileAvailabilityStatus) => {
    switch (status) {
      case 'both':
        return t.availability.labels.both;
      case 'disk':
        return t.availability.labels.disk;
      case 'db':
        return t.availability.labels.db;
      case 'missing':
        return t.availability.labels.missing;
      default:
        return status;
    }
  };

  const getAvailabilityTooltip = (status: FileAvailabilityStatus) => {
    switch (status) {
      case 'both':
        return t.availability.tooltips.both.value;
      case 'disk':
        return t.availability.tooltips.disk.value;
      case 'db':
        return t.availability.tooltips.db.value;
      case 'missing':
        return t.availability.tooltips.missing.value;
      default:
        return status;
    }
  };

  const renderAvailabilityBadge = (availability?: FileAvailability) => {
    if (!availability) return null;
    const status = availability.status;
    const colorClasses =
      status === 'missing'
        ? 'bg-red-50 text-red-700 border-red-200'
        : status === 'both'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-blue-50 text-blue-700 border-blue-200';

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${colorClasses}`}
        title={getAvailabilityTooltip(status)}
      >
        {getAvailabilityLabel(status)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container-shared px-4 py-16">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <LoadingAnimation size="lg" />
          <span>{t.loading}</span>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="container-shared px-4 py-12">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-gray-900 font-semibold mb-2">{t.notFound}</p>
          <button
            type="button"
            onClick={() => router.push('/storage')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.tabs.transactions.value}
          </button>
        </div>
      </div>
    );
  }

  const {
    statement,
    transactions,
    sharedLinks,
    permissions,
    isOwner,
    userPermission,
    fileAvailability,
  } = details;

  const tabs = [
    {
      key: 'transactions' as const,
      label: `${t.tabs.transactions.value} (${transactions.length})`,
    },
    { key: 'links' as const, label: `${t.tabs.links.value} (${sharedLinks.length})` },
    ...(isOwner
      ? [
          {
            key: 'permissions' as const,
            label: `${t.tabs.permissions.value} (${permissions.length})`,
          },
        ]
      : []),
  ];

  return (
    <div className="container-shared px-4 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push('/storage')}
            className="rounded-full border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:bg-gray-50"
            aria-label="Back to storage"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 break-all">{statement.fileName}</h1>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary">
                {getBankDisplayName(statement.bankName)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                {getStatusLabel(statement.status)}
              </span>
              {renderAvailabilityBadge(fileAvailability)}
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700">
                {isOwner ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                {isOwner ? t.permission.owner.value : getPermissionLabel(userPermission)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
            title={t.actions.downloadTooltip.value}
          >
            <Download className="h-4 w-4" />
            {t.actions.download}
          </button>
          {(isOwner || userPermission === 'editor') && (
            <button
              type="button"
              onClick={() => {
                setCurrentTab('links');
                setShareDialogOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
              title={t.actions.shareTooltip.value}
            >
              <Share2 className="h-4 w-4" />
              {t.actions.share}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_1.4fr]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">{t.cards.size}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatFileSize(statement.fileSize)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">{t.cards.transactions}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{transactions.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">{t.cards.uploadedAt}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatDate(statement.createdAt)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">{t.cards.account}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {statement.metadata?.accountNumber || t.cards.dash.value}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-gray-900 font-semibold">
              <RefreshCcw className="h-4 w-4 text-primary" />
              {t.preview.title}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => loadPreview()}
                disabled={previewLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {previewLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {!previewLoading && <RefreshCcw className="h-4 w-4" />}
                {t.preview.refresh}
              </button>
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => previewUrl && window.open(previewUrl, '_blank')}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t.preview.openNewTab}
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-dashed border-gray-200 bg-gray-50/60">
            {previewLoading && (
              <div className="flex min-h-[360px] items-center justify-center text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}

            {!previewLoading && previewError && (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 bg-white px-4 text-center text-sm text-gray-700">
                <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-red-700">
                  {previewError}
                </div>
                <button
                  type="button"
                  onClick={() => loadPreview()}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
                >
                  <RefreshCcw className="h-4 w-4" />
                  {t.preview.retry}
                </button>
              </div>
            )}

            {!previewLoading && !previewError && previewUrl && (
              <iframe
                src={previewUrl}
                title={t.preview.iframeTitle.value}
                className="h-[420px] w-full border-0 bg-white"
              />
            )}

            {!previewLoading && !previewError && !previewUrl && (
              <div className="flex min-h-[360px] items-center justify-center bg-white px-4 text-center text-sm text-gray-600">
                {t.preview.empty}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
          {tabs.map(tab => {
            const isActive = tab.key === currentTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCurrentTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-4">
          {currentTab === 'transactions' && (
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
              <TransactionsView transactions={transactions} />
            </div>
          )}

          {currentTab === 'links' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-lg font-semibold text-gray-900">{t.tabs.links.value}</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShareDialogOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
                  >
                    <Share2 className="h-4 w-4" />
                    {t.actions.share}
                  </button>
                </div>
              </div>

              {sharedLinks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
                  {t.tabs.links.value} — {t.preview.empty}
                </div>
              ) : (
                <div className="grid gap-3">
                  {sharedLinks.map(link => (
                    <div
                      key={link.id}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                              {link.permission}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                link.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {link.status}
                            </span>
                            {link.expiresAt && (
                              <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                                {formatDate(link.expiresAt)}
                              </span>
                            )}
                          </div>
                          {link.description && (
                            <p className="text-sm text-gray-700">{link.description}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {t.cards.uploadedAt}: {formatDate(link.createdAt)} •{' '}
                            {t.cards.transactions}: {link.accessCount}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const shareUrl = `${window.location.origin}/shared/${link.token}`;
                              navigator.clipboard.writeText(shareUrl).catch(() => undefined);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            {t.actions.share}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShareDialogOpen(true)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            {t.preview.refresh}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentTab === 'permissions' && isOwner && (
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
              <PermissionsPanel
                fileId={fileId}
                permissions={permissions}
                onPermissionsUpdate={loadFileDetails}
              />
            </div>
          )}
        </div>
      </div>

      <ShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        fileId={fileId}
        sharedLinks={sharedLinks}
        onLinksUpdate={loadFileDetails}
      />
    </div>
  );
}
