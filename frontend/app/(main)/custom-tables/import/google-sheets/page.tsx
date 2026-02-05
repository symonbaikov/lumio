'use client';

import { useAuth } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import { Icon } from '@iconify/react';
import { Loader2, Sparkles } from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multi_select';
type LayoutType = 'auto' | 'flat' | 'matrix';
interface GoogleSheetConnection {
  id: string;
  sheetId: string;
  sheetName: string;
  worksheetName?: string | null;
  isActive?: boolean;
  oauthConnected?: boolean;
}

interface Category {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

interface PreviewColumn {
  index: number;
  a1: string;
  title: string;
  suggestedType: ColumnType;
  include: boolean;
}

interface PreviewResponse {
  spreadsheetId: string;
  worksheetName: string;
  usedRange: { a1: string; rowsCount: number; colsCount: number };
  layoutSuggested: LayoutType;
  headerRowIndex: number;
  columns: PreviewColumn[];
  sampleRows: Array<{
    rowNumber: number;
    values: Array<string | null>;
    styles?: Array<Record<string, any> | null>;
  }>;
}

export default function GoogleSheetsImportPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useIntlayer('customTablesImportGoogleSheetsPage');

  const [connections, setConnections] = useState<GoogleSheetConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');

  const [googleSheetId, setGoogleSheetId] = useState('');
  const [worksheetName, setWorksheetName] = useState('');
  const [range, setRange] = useState('');
  const [layoutType, setLayoutType] = useState<LayoutType>('auto');
  const [headerRowIndex, setHeaderRowIndex] = useState(0);

  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [columns, setColumns] = useState<PreviewColumn[]>([]);

  const [tableName, setTableName] = useState('');
  const [tableDescription, setTableDescription] = useState('');
  const [importData, setImportData] = useState(true);

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [jobId, setJobId] = useState('');
  const [jobStatus, setJobStatus] = useState('');
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStage, setJobStage] = useState('');
  const [jobError, setJobError] = useState('');

  const selectedConnection = useMemo(
    () => connections.find(c => c.id === googleSheetId) || null,
    [connections, googleSheetId],
  );

  const canPreview = Boolean(googleSheetId && selectedConnection?.oauthConnected !== false);
  const canCommit = Boolean(preview && tableName.trim() && columns.some(c => c.include));

  const loadConnections = async () => {
    setLoadingConnections(true);
    try {
      const response = await apiClient.get('/google-sheets');
      const items: GoogleSheetConnection[] = response.data?.data || response.data || [];
      setConnections(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Failed to load google sheets connections:', error);
      toast.error(t.toasts.loadConnectionsFailed.value);
    } finally {
      setLoadingConnections(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      const payload = response.data?.data || response.data || [];
      setCategories(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadConnections();
      loadCategories();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (!selectedConnection) return;
    const nextWorksheet = selectedConnection.worksheetName || '';
    setWorksheetName(prev => prev || nextWorksheet);
    setTableName(prev => prev || selectedConnection.sheetName || t.defaults.tableName.value);
  }, [selectedConnection]);

  const handlePreview = async () => {
    if (!googleSheetId) return;
    if (selectedConnection?.oauthConnected === false) {
      toast.error(t.toasts.oauthRequired.value);
      return;
    }
    setLoadingPreview(true);
    try {
      const response = await apiClient.post('/custom-tables/import/google-sheets/preview', {
        googleSheetId,
        worksheetName: worksheetName.trim() || undefined,
        range: range.trim() || undefined,
        headerRowIndex,
        layoutType,
      });

      const data: PreviewResponse = response.data?.data || response.data;
      setPreview(data);
      setColumns(data.columns || []);
      setHeaderRowIndex(data.headerRowIndex ?? headerRowIndex);
      if (!tableName.trim()) {
        setTableName(selectedConnection?.sheetName || t.defaults.tableName.value);
      }
      toast.success(t.toasts.previewReady.value);
    } catch (error: any) {
      console.error('Preview failed:', error);
      const message = error?.response?.data?.message || t.toasts.previewFailed.value;
      toast.error(message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCommit = async () => {
    if (!preview || !canCommit) return;
    setCommitting(true);
    try {
      const response = await apiClient.post('/custom-tables/import/google-sheets/commit', {
        googleSheetId,
        worksheetName: worksheetName.trim() || undefined,
        range: range.trim() || undefined,
        name: tableName.trim(),
        description: tableDescription.trim() ? tableDescription.trim() : undefined,
        categoryId: categoryId ? categoryId : undefined,
        headerRowIndex,
        importData,
        layoutType,
        columns: columns.map(c => ({
          index: c.index,
          title: c.title,
          type: c.suggestedType,
          include: c.include,
        })),
      });

      const result = response.data?.data || response.data;
      const nextJobId = result?.jobId;
      if (!nextJobId) {
        toast.error(t.toasts.importStartFailed.value);
        return;
      }
      setJobId(nextJobId);
      setJobStatus('pending');
      setJobProgress(0);
      setJobStage('queued');
      setJobError('');
      toast.success(t.toasts.importStarted.value);
    } catch (error: any) {
      console.error('Commit failed:', error);
      const message = error?.response?.data?.message || t.toasts.importFailed.value;
      toast.error(message);
    } finally {
      setCommitting(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timer: number | null = null;

    const poll = async () => {
      try {
        const response = await apiClient.get(`/custom-tables/import/jobs/${jobId}`);
        const payload = response.data?.data || response.data;
        if (cancelled) return;

        const status = String(payload?.status || '');
        setJobStatus(status);
        setJobProgress(typeof payload?.progress === 'number' ? payload.progress : 0);
        setJobStage(String(payload?.stage || ''));
        setJobError(String(payload?.error || ''));

        if (status === 'done') {
          const tableId = payload?.result?.tableId;
          toast.success(t.toasts.importDone.value);
          if (tableId) {
            router.push(`/custom-tables/${tableId}`);
          } else {
            router.push('/custom-tables');
          }
          return;
        }

        if (status === 'failed') {
          toast.error(payload?.error || t.toasts.importError.value);
          return;
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Job poll failed:', error);
      }

      timer = window.setTimeout(poll, 1500);
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [jobId, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          {t.auth.loginRequired}
        </div>
      </div>
    );
  }

  return (
    <div className="container-shared px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-start gap-3 mb-6" data-tour-id="gs-import-header">
        <div className="p-2 rounded-full bg-primary/10 text-primary">
          <Image
            src="/icons/icons8-google-sheets-48.png"
            alt="Google Sheets"
            width={24}
            height={24}
            className="h-6 w-6"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{t.header.title}</h1>
          <p className="text-secondary mt-1">{t.header.subtitle}</p>
        </div>
        <Link
          href="/custom-tables"
          className="text-sm text-gray-600 hover:text-gray-900"
          data-tour-id="gs-import-back"
        >
          {t.header.back}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <div
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            data-tour-id="gs-import-source-card"
          >
            <div className="text-sm font-semibold text-gray-900 mb-3">{t.source.title}</div>
            <label className="block mb-3">
              <span className="text-sm font-medium text-gray-700">{t.source.connectionLabel}</span>
              <select
                value={googleSheetId}
                onChange={e => {
                  setGoogleSheetId(e.target.value);
                  setPreview(null);
                  setColumns([]);
                }}
                data-tour-id="gs-import-connection"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">{t.source.selectPlaceholder}</option>
                {connections.map(c => (
                  <option key={c.id} value={c.id} disabled={c.oauthConnected === false}>
                    {c.sheetName}
                    {c.oauthConnected === false ? t.source.oauthNeededSuffix.value : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="block mb-3">
              <span className="text-sm font-medium text-gray-700">{t.source.worksheetLabel}</span>
              <input
                value={worksheetName}
                onChange={e => setWorksheetName(e.target.value)}
                data-tour-id="gs-import-worksheet"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder={t.source.worksheetPlaceholder.value}
              />
              <div className="mt-1 text-xs text-gray-500">{t.source.worksheetHelp}</div>
            </label>

            <label className="block mb-3">
              <span className="text-sm font-medium text-gray-700">{t.source.rangeLabel}</span>
              <input
                value={range}
                onChange={e => setRange(e.target.value)}
                data-tour-id="gs-import-range"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder={t.source.rangePlaceholder.value}
              />
            </label>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {t.source.headerOffsetLabel}
                </span>
                <input
                  type="number"
                  min={0}
                  value={headerRowIndex}
                  onChange={e => setHeaderRowIndex(Number(e.target.value))}
                  data-tour-id="gs-import-header-offset"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <div className="mt-1 text-xs text-gray-500">{t.source.headerOffsetHelp}</div>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">{t.source.layoutLabel}</span>
                <select
                  value={layoutType}
                  onChange={e => setLayoutType(e.target.value as LayoutType)}
                  data-tour-id="gs-import-layout"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="auto">{t.source.layoutAuto}</option>
                  <option value="flat">{t.source.layoutFlat}</option>
                  <option value="matrix">{t.source.layoutMatrix}</option>
                </select>
              </label>
            </div>

            <button
              onClick={handlePreview}
              disabled={!canPreview || loadingPreview || loadingConnections}
              data-tour-id="gs-import-preview-button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {(loadingPreview || loadingConnections) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {loadingConnections ? t.source.previewButtonLoading : t.source.previewButton}
            </button>
            {loadingConnections && (
              <div className="mt-2 text-xs text-gray-500">{t.source.loadingConnections}</div>
            )}
          </div>

          <div
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            data-tour-id="gs-import-result-card"
          >
            <div className="text-sm font-semibold text-gray-900 mb-3">{t.result.title}</div>
            <label className="block mb-3">
              <span className="text-sm font-medium text-gray-700">{t.result.tableNameLabel}</span>
              <input
                value={tableName}
                onChange={e => setTableName(e.target.value)}
                data-tour-id="gs-import-table-name"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder={t.result.tableNamePlaceholder.value}
              />
            </label>
            <label className="block mb-3">
              <span className="text-sm font-medium text-gray-700">{t.result.descriptionLabel}</span>
              <input
                value={tableDescription}
                onChange={e => setTableDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </label>

            <label className="block mb-3">
              <span className="text-sm font-medium text-gray-700">{t.result.categoryLabel}</span>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                data-tour-id="gs-import-category"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">{t.result.noCategory}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {categoryId && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200"
                    style={{
                      backgroundColor:
                        categories.find(c => c.id === categoryId)?.color || '#f3f4f6',
                    }}
                  >
                    {(() => {
                      const selected = categories.find(c => c.id === categoryId);
                      return selected?.icon ? (
                        <Icon icon={selected.icon} className="h-4 w-4 text-gray-900" />
                      ) : (
                        <Image
                          src="/icons/icons8-google-sheets-48.png"
                          alt="Google Sheets"
                          width={16}
                          height={16}
                          className="h-4 w-4"
                        />
                      );
                    })()}
                  </span>
                  <span>{t.result.categoryHint}</span>
                </div>
              )}
            </label>

            <label
              className="flex items-center gap-2 text-sm text-gray-700 mb-4"
              data-tour-id="gs-import-import-data"
            >
              <input
                type="checkbox"
                checked={importData}
                onChange={e => setImportData(e.target.checked)}
                className="h-5 w-5"
              />
              {t.result.importDataCheckbox}
            </label>

            <button
              onClick={handleCommit}
              disabled={!canCommit || committing || Boolean(jobId)}
              data-tour-id="gs-import-commit-button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {committing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {jobId ? t.result.importRunning : t.result.importButton}
            </button>
            {jobId ? (
              <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-gray-900">
                    {t.result.progressTitle}
                  </div>
                  <div className="text-sm font-semibold text-gray-700">
                    {Math.round(jobProgress)}%
                  </div>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.max(0, Math.min(100, jobProgress))}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  {t.result.statusLabel.value}:{' '}
                  <span className="font-medium">{jobStatus || t.result.dash.value}</span>{' '}
                  {jobStage ? <span className="text-gray-500">({jobStage})</span> : null}
                </div>
                {jobError ? (
                  <div className="mt-2 text-xs text-red-600 wrap-break-word">{jobError}</div>
                ) : null}
              </div>
            ) : null}
            {!preview && (
              <div className="mt-2 text-xs text-gray-500">{t.result.needPreviewHint}</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            data-tour-id="gs-import-preview-panel"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">{t.preview.title}</div>
                <div className="text-xs text-gray-500 mt-1">{t.preview.subtitle}</div>
              </div>
              {preview && (
                <div className="text-xs text-gray-500 text-right">
                  <div>{preview.usedRange.a1}</div>
                  <div>
                    {preview.usedRange.rowsCount}×{preview.usedRange.colsCount},{' '}
                    {t.preview.layoutPrefix.value}: {preview.layoutSuggested}
                  </div>
                </div>
              )}
            </div>

            {!preview ? (
              <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
                {t.preview.hint}
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-2 py-2 text-left font-semibold text-gray-700">
                        {t.preview.rowHeader}
                      </th>
                      {preview.columns.slice(0, 12).map(c => (
                        <th
                          key={c.index}
                          className="px-2 py-2 text-left font-semibold text-gray-700"
                        >
                          {c.title}
                        </th>
                      ))}
                      {preview.columns.length > 12 && (
                        <th className="px-2 py-2 text-left font-semibold text-gray-500">…</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sampleRows.map(r => (
                      <tr key={r.rowNumber} className="border-b border-gray-100 last:border-0">
                        <td className="px-2 py-1 text-gray-500">{r.rowNumber}</td>
                        {r.values.slice(0, 12).map((v, idx) => {
                          const style = r.styles?.[idx] || null;
                          const css = sheetStyleToCss(style || {});
                          return (
                            <td
                              key={`${r.rowNumber}-${idx}`}
                              className="px-2 py-1 text-gray-700"
                              style={css}
                            >
                              {v ?? '—'}
                            </td>
                          );
                        })}
                        {preview.columns.length > 12 && (
                          <td className="px-2 py-1 text-gray-500">…</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            data-tour-id="gs-import-columns-panel"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">{t.columns.title}</div>
                <div className="text-xs text-gray-500 mt-1">{t.columns.subtitle}</div>
              </div>
              {preview && (
                <button
                  onClick={() => setColumns(prev => prev.map(c => ({ ...c, include: true })))}
                  data-tour-id="gs-import-enable-all"
                  className="text-xs text-primary hover:text-primary-hover"
                >
                  {t.columns.enableAll}
                </button>
              )}
            </div>

            {!preview ? (
              <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
                {t.columns.appearAfterPreview}
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 w-[84px]">
                        {t.columns.tableHeaders.enabled}
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 w-20">A1</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">
                        {t.columns.tableHeaders.name}
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 w-[180px]">
                        {t.columns.tableHeaders.type}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map(c => (
                      <tr key={c.index} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={c.include}
                            onChange={e =>
                              setColumns(prev =>
                                prev.map(x =>
                                  x.index === c.index ? { ...x, include: e.target.checked } : x,
                                ),
                              )
                            }
                            className="h-5 w-5"
                          />
                        </td>
                        <td className="px-3 py-2 text-gray-500">{c.a1}</td>
                        <td className="px-3 py-2">
                          <input
                            value={c.title}
                            onChange={e =>
                              setColumns(prev =>
                                prev.map(x =>
                                  x.index === c.index ? { ...x, title: e.target.value } : x,
                                ),
                              )
                            }
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={c.suggestedType}
                            onChange={e =>
                              setColumns(prev =>
                                prev.map(x =>
                                  x.index === c.index
                                    ? {
                                        ...x,
                                        suggestedType: e.target.value as ColumnType,
                                      }
                                    : x,
                                ),
                              )
                            }
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          >
                            <option value="text">{t.columns.types.text}</option>
                            <option value="number">{t.columns.types.number}</option>
                            <option value="date">{t.columns.types.date}</option>
                            <option value="boolean">{t.columns.types.boolean}</option>
                            <option value="select">{t.columns.types.select}</option>
                            <option value="multi_select">{t.columns.types.multiSelect}</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// Minimal style -> CSS mapper for preview
const mapHorizontalAlignment = (value: unknown): CSSProperties['textAlign'] | undefined => {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!raw) return undefined;
  if (raw === 'LEFT') return 'left';
  if (raw === 'CENTER') return 'center';
  if (raw === 'RIGHT') return 'right';
  if (raw === 'JUSTIFY') return 'justify';
  return undefined;
};

const sheetStyleToCss = (style: Record<string, any>) => {
  const backgroundColor =
    typeof style.backgroundColor === 'string' ? style.backgroundColor : undefined;
  const textAlign = mapHorizontalAlignment(style.horizontalAlignment);
  const tf =
    style.textFormat && typeof style.textFormat === 'object' ? (style.textFormat as any) : null;
  const color = tf && typeof tf.foregroundColor === 'string' ? tf.foregroundColor : undefined;
  const fontWeight = tf && typeof tf.bold === 'boolean' ? (tf.bold ? 700 : 400) : undefined;
  const fontStyle =
    tf && typeof tf.italic === 'boolean' ? (tf.italic ? 'italic' : 'normal') : undefined;

  const underline = tf && typeof tf.underline === 'boolean' ? tf.underline : undefined;
  const strikethrough = tf && typeof tf.strikethrough === 'boolean' ? tf.strikethrough : undefined;
  let textDecorationLine: CSSProperties['textDecorationLine'] | undefined;
  if (underline === true || strikethrough === true) {
    const parts: string[] = [];
    if (underline === true) parts.push('underline');
    if (strikethrough === true) parts.push('line-through');
    textDecorationLine = parts.join(' ') as any;
  } else if (underline === false || strikethrough === false) {
    textDecorationLine = 'none';
  }

  const fontSize =
    tf && typeof tf.fontSize === 'number' && Number.isFinite(tf.fontSize) && tf.fontSize > 0
      ? tf.fontSize
      : undefined;
  const fontFamily =
    tf && typeof tf.fontFamily === 'string' && tf.fontFamily.trim() ? tf.fontFamily : undefined;

  return {
    backgroundColor,
    textAlign,
    color,
    fontWeight,
    fontStyle,
    textDecorationLine,
    fontSize,
    fontFamily,
  };
};
