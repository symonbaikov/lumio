'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { Spinner } from '@/app/components/ui/spinner';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import { type WorksheetOption, getDefaultWorksheetName } from '@/app/lib/googleSheetsSelection';
import { Box, Typography } from '@mui/material';
import { Sparkles, Tag as CategoryIconFallback } from '@/app/components/icons';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from 'next-themes';
import { tokens } from '@/lib/theme-tokens';

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
    styles?: Array<SheetCellStyle | null>;
  }>;
}

type SheetTextFormat = {
  foregroundColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
};

type SheetCellStyle = {
  backgroundColor?: string;
  horizontalAlignment?: string;
  textFormat?: SheetTextFormat;
};

type JobPollResult = {
  status: string;
  progress: number;
  stage: string;
  error: string;
  tableId?: string;
};

async function fetchJobStatus(jobId: string): Promise<JobPollResult | null> {
  try {
    const response = await apiClient.get(`/custom-tables/import/jobs/${jobId}`);
    const payload = response.data?.data || response.data;
    return {
      status: String(payload?.status || ''),
      progress: typeof payload?.progress === 'number' ? payload.progress : 0,
      stage: String(payload?.stage || ''),
      error: String(payload?.error || ''),
      tableId: payload?.result?.tableId,
    };
  } catch (error) {
    console.error('Job poll failed:', error);
    return null;
  }
}

export default function GoogleSheetsImportPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useIntlayer('customTablesImportGoogleSheetsPage');
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;

  const [connections, setConnections] = useState<GoogleSheetConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');

  const [sourceUrl, setSourceUrl] = useState('');
  const [googleSheetId, setGoogleSheetId] = useState('');
  const [worksheetName, setWorksheetName] = useState('');
  const [worksheetOptions, setWorksheetOptions] = useState<WorksheetOption[]>([]);
  const [loadingWorksheets, setLoadingWorksheets] = useState(false);
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
  const hasSourceUrl = Boolean(sourceUrl.trim());

  const canPreview = Boolean(hasSourceUrl || (googleSheetId && selectedConnection?.oauthConnected !== false));
  const canCommit = Boolean(preview && tableName.trim() && columns.some(c => c.include));

  const loadConnections = async () => {
    setLoadingConnections(true);
    try {
      const response = await apiClient.get('/google-sheets');
      const items: GoogleSheetConnection[] = response.data?.data || response.data || [];
      setConnections(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Failed to load google sheets connections:', error);
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

  useEffect(() => {
    if (!selectedConnection?.sheetId || selectedConnection.oauthConnected === false) {
      setWorksheetOptions([]);
      return;
    }
    const sheetId = selectedConnection.sheetId;
    const fallbackName = selectedConnection.worksheetName || '';

    const loadWorksheets = async () => {
      try {
        setLoadingWorksheets(true);
        const response = await apiClient.get(`/google-sheets/spreadsheets/${sheetId}/worksheets`);
        const items: WorksheetOption[] = response.data?.data || response.data || [];
        setWorksheetOptions(items);
        setWorksheetName(current => getDefaultWorksheetName(current || fallbackName, items));
      } catch {
        setWorksheetOptions([]);
      } finally {
        setLoadingWorksheets(false);
      }
    };

    void loadWorksheets();
  }, [selectedConnection]);

  const handlePreview = async () => {
    if (!hasSourceUrl && (!googleSheetId || selectedConnection?.oauthConnected === false)) {
      if (selectedConnection?.oauthConnected === false) {
        toast.error(t.toasts.oauthRequired.value);
      }
      return;
    }
    setLoadingPreview(true);
    try {
      const response = await apiClient.post('/custom-tables/import/google-sheets/preview', {
        sourceUrl: hasSourceUrl ? sourceUrl.trim() : undefined,
        googleSheetId: hasSourceUrl ? undefined : googleSheetId,
        worksheetName: worksheetName.trim() || undefined,
        range: range.trim() || undefined,
        headerRowIndex,
        layoutType,
      });
      const data: PreviewResponse = response.data?.data || response.data;
      setPreview(data);
      setColumns(data.columns || []);
      setHeaderRowIndex(data.headerRowIndex ?? headerRowIndex);
      const fallbackName = hasSourceUrl ? t.defaults.tableName.value : selectedConnection?.sheetName || t.defaults.tableName.value;
      setTableName(prev => prev.trim() ? prev : fallbackName);
      toast.success(t.toasts.previewReady.value);
    } catch (error: unknown) {
      console.error('Preview failed:', error);
      toast.error(getApiErrorMessage(error, t.toasts.previewFailed.value));
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCommit = async () => {
    if (!preview || !canCommit) return;
    setCommitting(true);
    try {
      const response = await apiClient.post('/custom-tables/import/google-sheets/commit', {
        sourceUrl: hasSourceUrl ? sourceUrl.trim() : undefined,
        googleSheetId: hasSourceUrl ? undefined : googleSheetId,
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
    } catch (error: unknown) {
      console.error('Commit failed:', error);
      toast.error(getApiErrorMessage(error, t.toasts.importFailed.value));
    } finally {
      setCommitting(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timer: number | null = null;

    const poll = async () => {
      const result = await fetchJobStatus(jobId);
      if (cancelled) {
        return;
      }
      if (!result) {
        timer = window.setTimeout(poll, 1500);
        return;
      }
      setJobStatus(result.status);
      setJobProgress(result.progress);
      setJobStage(result.stage);
      setJobError(result.error);

      if (result.status === 'done') {
        toast.success(t.toasts.importDone.value);
        const dest = result.tableId ? `/custom-tables/${result.tableId}` : '/custom-tables';
        router.push(dest);
        return;
      }
      if (result.status === 'failed') {
        toast.error(result.error || t.toasts.importError.value);
        return;
      }
      timer = window.setTimeout(poll, 1500);
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [jobId, router]);

  const inputStyle: CSSProperties = {
    marginTop: 4,
    width: '100%',
    border: `1px solid ${c.ink150}`,
    background: 'var(--card-bg)',
    padding: '8px 12px',
    fontSize: 14,
    boxSizing: 'border-box',
  };

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center', color: c.ink500 }}>
        <Spinner className="h-6 w-6" />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 5 }}>
        <Box sx={{ border: `1px solid ${c.ink150}`, bgcolor: 'background.paper', p: 3, fontSize: 14, color: c.ink700 }}>
          {t.auth.loginRequired}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 3 }} data-tour-id="gs-import-header">
        <Box sx={{ p: 1, bgcolor: 'primary.50', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Image
            src="/icons/icons8-google-sheets-48.png"
            alt="Google Sheets"
            width={24}
            height={24}
            className="h-6 w-6"
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography style={{ fontSize: 22, fontWeight: 700, color: c.ink900 }}>{t.header.title}</Typography>
          <Typography style={{ fontSize: 14, color: c.ink500, marginTop: 4 }}>{t.header.subtitle}</Typography>
        </Box>
        <Link
          href="/custom-tables"
          style={{ fontSize: 14, color: c.ink700, textDecoration: 'none' }}
          data-tour-id="gs-import-back"
        >
          {t.header.back}
        </Link>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' }, gap: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{ border: `1px solid ${c.ink150}`, bgcolor: 'background.paper', p: 2 }}
            data-tour-id="gs-import-source-card"
          >
            <Typography style={{ fontSize: 14, fontWeight: 600, color: c.ink900, marginBottom: 12 }}>{t.source.title}</Typography>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: c.ink800 }}>Google Sheets link</span>
              <input
                value={sourceUrl}
                onChange={e => {
                  setSourceUrl(e.target.value);
                  setPreview(null);
                  setColumns([]);
                }}
                data-tour-id="gs-import-source-url"
                style={inputStyle}
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: c.ink500 }}>
                Paste a shared or published Google Sheets link. Lumio imports a snapshot through the public export URL, without OAuth or Google SDK.
              </span>
            </label>

            {connections.length || loadingConnections ? (
              <label style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: c.ink800 }}>Legacy saved connection</span>
                <select
                  value={googleSheetId}
                  onChange={e => {
                    setGoogleSheetId(e.target.value);
                    setSourceUrl('');
                    setPreview(null);
                    setColumns([]);
                    setWorksheetOptions([]);
                    setWorksheetName('');
                  }}
                  data-tour-id="gs-import-connection"
                  style={inputStyle}
                >
                  <option value="">Use link above instead</option>
                  {connections.map(c => (
                    <option key={c.id} value={c.id} disabled={c.oauthConnected === false}>
                      {c.sheetName}
                      {c.oauthConnected === false ? t.source.oauthNeededSuffix.value : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: c.ink800 }}>{t.source.worksheetLabel}</span>
              {hasSourceUrl ? (
                <input
                  value={worksheetName}
                  onChange={e => setWorksheetName(e.target.value)}
                  data-tour-id="gs-import-worksheet"
                  style={inputStyle}
                  placeholder="Leave empty to use the first worksheet"
                />
              ) : (
                <select
                  value={worksheetName}
                  onChange={e => setWorksheetName(e.target.value)}
                  data-tour-id="gs-import-worksheet"
                  style={{ ...inputStyle, opacity: (!selectedConnection || loadingWorksheets) ? 0.6 : 1 }}
                  disabled={!selectedConnection || loadingWorksheets}
                >
                  <option value="">
                    {loadingWorksheets ? t.source.worksheetLoading : t.source.worksheetPlaceholder}
                  </option>
                  {worksheetOptions.map(item => (
                    <option key={item.title} value={item.title}>
                      {item.title}
                    </option>
                  ))}
                </select>
              )}
              <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: c.ink500 }}>{t.source.worksheetHelp}</span>
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: c.ink800 }}>{t.source.rangeLabel}</span>
              <input
                value={range}
                onChange={e => setRange(e.target.value)}
                data-tour-id="gs-import-range"
                style={inputStyle}
                placeholder={t.source.rangePlaceholder.value}
              />
            </label>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: c.ink800 }}>
                  {t.source.headerOffsetLabel}
                </span>
                <input
                  type="number"
                  min={0}
                  value={headerRowIndex}
                  onChange={e => setHeaderRowIndex(Number(e.target.value))}
                  data-tour-id="gs-import-header-offset"
                  style={inputStyle}
                />
                <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: c.ink500 }}>{t.source.headerOffsetHelp}</span>
              </label>

              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: c.ink800 }}>{t.source.layoutLabel}</span>
                <select
                  value={layoutType}
                  onChange={e => setLayoutType(e.target.value as LayoutType)}
                  data-tour-id="gs-import-layout"
                  style={inputStyle}
                >
                  <option value="auto">{t.source.layoutAuto}</option>
                  <option value="flat">{t.source.layoutFlat}</option>
                  <option value="matrix">{t.source.layoutMatrix}</option>
                </select>
              </label>
            </Box>

            <Box
              component="button"
              onClick={handlePreview}
              disabled={!canPreview || loadingPreview || loadingConnections}
              data-tour-id="gs-import-preview-button"
              sx={{
                display: 'inline-flex',
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                bgcolor: 'primary.main',
                color: '#fff',
                px: 2,
                py: 1,
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'primary.dark' },
                '&:disabled': { opacity: 0.7, cursor: 'not-allowed' },
              }}
            >
              {(loadingPreview || loadingConnections) && <Spinner className="h-4 w-4" />}
              {loadingConnections ? t.source.previewButtonLoading : t.source.previewButton}
            </Box>
            {loadingConnections && (
              <Typography style={{ marginTop: 8, fontSize: 12, color: c.ink500 }}>{t.source.loadingConnections}</Typography>
            )}
          </Box>

          <Box
            sx={{ border: `1px solid ${c.ink150}`, bgcolor: 'background.paper', p: 2 }}
            data-tour-id="gs-import-result-card"
          >
            <Typography style={{ fontSize: 14, fontWeight: 600, color: c.ink900, marginBottom: 12 }}>{t.result.title}</Typography>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: c.ink800 }}>{t.result.tableNameLabel}</span>
              <input
                value={tableName}
                onChange={e => setTableName(e.target.value)}
                data-tour-id="gs-import-table-name"
                style={inputStyle}
                placeholder={t.result.tableNamePlaceholder.value}
              />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: c.ink800 }}>{t.result.descriptionLabel}</span>
              <input
                value={tableDescription}
                onChange={e => setTableDescription(e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: c.ink800 }}>{t.result.categoryLabel}</span>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                data-tour-id="gs-import-category"
                style={inputStyle}
              >
                <option value="">{t.result.noCategory}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {categoryId && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, fontSize: 12, color: c.ink700 }}>
                  <Box
                    sx={{ display: 'inline-flex', width: 24, height: 24, alignItems: 'center', justifyContent: 'center', border: `1px solid ${c.ink150}`, bgcolor: categories.find(cat => cat.id === categoryId)?.color || c.ink50 }}
                  >
                    {(() => {
                      const selected = categories.find(cat => cat.id === categoryId);
                      return selected?.icon ? (
                        <CategoryIconFallback size={16} />
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
                  </Box>
                  <span>{t.result.categoryHint}</span>
                </Box>
              )}
            </label>

            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 14, color: c.ink800, mb: 2 }}
              data-tour-id="gs-import-import-data"
            >
              <Checkbox checked={importData} onCheckedChange={setImportData} className="h-5 w-5" />
              {t.result.importDataCheckbox}
            </Box>

            <Box
              component="button"
              onClick={handleCommit}
              disabled={!canCommit || committing || Boolean(jobId)}
              data-tour-id="gs-import-commit-button"
              sx={{
                display: 'inline-flex',
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                px: 2,
                py: 1,
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'primary.dark' },
                '&:disabled': { opacity: 0.7, cursor: 'not-allowed' },
              }}
            >
              {committing ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {jobId ? t.result.importRunning : t.result.importButton}
            </Box>
            {jobId ? (
              <Box sx={{ mt: 1.5, border: `1px solid ${c.ink150}`, bgcolor: 'background.paper', p: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Typography style={{ fontSize: 14, fontWeight: 600, color: c.ink900 }}>
                    {t.result.progressTitle}
                  </Typography>
                  <Typography style={{ fontSize: 14, fontWeight: 600, color: c.ink800 }}>
                    {Math.round(jobProgress)}%
                  </Typography>
                </Box>
                <Box sx={{ mt: 1, height: 8, width: '100%', bgcolor: 'action.hover', overflow: 'hidden' }}>
                  <Box
                    sx={{ height: '100%', bgcolor: 'primary.main', width: `${Math.max(0, Math.min(100, jobProgress))}%` }}
                  />
                </Box>
                <Typography style={{ marginTop: 8, fontSize: 12, color: c.ink700 }}>
                  {t.result.statusLabel.value}:{' '}
                  <span style={{ fontWeight: 500 }}>{jobStatus || t.result.dash.value}</span>{' '}
                  {jobStage ? <span style={{ color: c.ink500 }}>({jobStage})</span> : null}
                </Typography>
                {jobError ? (
                  <Typography style={{ marginTop: 8, fontSize: 12, color: c.danger, overflowWrap: 'break-word' }}>{jobError}</Typography>
                ) : null}
              </Box>
            ) : null}
            {!preview && (
              <Typography style={{ marginTop: 8, fontSize: 12, color: c.ink500 }}>{t.result.needPreviewHint}</Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{ border: `1px solid ${c.ink150}`, bgcolor: 'background.paper', p: 2 }}
            data-tour-id="gs-import-preview-panel"
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
              <Box>
                <Typography style={{ fontSize: 14, fontWeight: 600, color: c.ink900 }}>{t.preview.title}</Typography>
                <Typography style={{ fontSize: 12, color: c.ink500, marginTop: 4 }}>{t.preview.subtitle}</Typography>
              </Box>
              {preview && (
                <Box style={{ fontSize: 12, color: c.ink500, textAlign: 'right' }}>
                  <div>{preview.usedRange.a1}</div>
                  <div>
                    {preview.usedRange.rowsCount}×{preview.usedRange.colsCount},{' '}
                    {t.preview.layoutPrefix.value}: {preview.layoutSuggested}
                  </div>
                </Box>
              )}
            </Box>

            {!preview ? (
              <Box sx={{ mt: 2, border: `1px dashed ${c.ink150}`, bgcolor: c.ink50, p: 3, fontSize: 14, color: c.ink700 }}>
                {t.preview.hint}
              </Box>
            ) : (
              <Box sx={{ mt: 2, overflowX: 'auto' }}>
                <table style={{ minWidth: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${c.ink150}` }}>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: c.ink800 }}>
                        {t.preview.rowHeader}
                      </th>
                      {preview.columns.slice(0, 12).map(col => (
                        <th
                          key={col.index}
                          style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: c.ink800 }}
                        >
                          {col.title}
                        </th>
                      ))}
                      {preview.columns.length > 12 && (
                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: c.ink500 }}>…</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sampleRows.map(r => (
                      <tr key={r.rowNumber} style={{ borderBottom: `1px solid ${c.ink50}` }}>
                        <td style={{ padding: '4px 8px', color: c.ink500 }}>{r.rowNumber}</td>
                        {r.values.slice(0, 12).map((v, idx) => {
                          const style = r.styles?.[idx] || null;
                          const css = sheetStyleToCss(style || {});
                          const { color: cssColor, ...cssRest } = css;
                          const tdStyle: CSSProperties = { padding: '4px 8px', color: cssColor ?? c.ink800, ...cssRest };
                          return (
                            <td
                              key={`${r.rowNumber}-${idx}`}
                              style={tdStyle}
                            >
                              {v ?? '—'}
                            </td>
                          );
                        })}
                        {preview.columns.length > 12 && (
                          <td style={{ padding: '4px 8px', color: c.ink500 }}>…</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}
          </Box>

          <Box
            sx={{ border: `1px solid ${c.ink150}`, bgcolor: 'background.paper', p: 2 }}
            data-tour-id="gs-import-columns-panel"
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
              <Box>
                <Typography style={{ fontSize: 14, fontWeight: 600, color: c.ink900 }}>{t.columns.title}</Typography>
                <Typography style={{ fontSize: 12, color: c.ink500, marginTop: 4 }}>{t.columns.subtitle}</Typography>
              </Box>
              {preview && (
                <Box
                  component="button"
                  onClick={() => setColumns(prev => prev.map(col => ({ ...col, include: true })))}
                  data-tour-id="gs-import-enable-all"
                  sx={{ fontSize: 12, color: 'primary.main', border: 'none', bgcolor: 'transparent', cursor: 'pointer', '&:hover': { color: 'primary.dark' } }}
                >
                  {t.columns.enableAll}
                </Box>
              )}
            </Box>

            {!preview ? (
              <Box sx={{ mt: 2, border: `1px dashed ${c.ink150}`, bgcolor: c.ink50, p: 3, fontSize: 14, color: c.ink700 }}>
                {t.columns.appearAfterPreview}
              </Box>
            ) : (
              <Box sx={{ mt: 2, overflowX: 'auto' }}>
                <table style={{ minWidth: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                  <thead style={{ background: c.ink50, borderBottom: `1px solid ${c.ink150}` }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: c.ink800, width: 84 }}>
                        {t.columns.tableHeaders.enabled}
                      </th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: c.ink800, width: 80 }}>A1</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: c.ink800 }}>
                        {t.columns.tableHeaders.name}
                      </th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: c.ink800, width: 180 }}>
                        {t.columns.tableHeaders.type}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((col, idx) => (
                      <tr key={col.index} style={{ borderBottom: idx < columns.length - 1 ? `1px solid ${c.ink50}` : 'none' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <Checkbox
                            checked={col.include}
                            onCheckedChange={checked =>
                              setColumns(prev =>
                                prev.map(x =>
                                  x.index === col.index ? { ...x, include: checked } : x,
                                ),
                              )
                            }
                            className="h-5 w-5"
                          />
                        </td>
                        <td style={{ padding: '8px 12px', color: c.ink500 }}>{col.a1}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            value={col.title}
                            onChange={e =>
                              setColumns(prev =>
                                prev.map(x =>
                                  x.index === col.index ? { ...x, title: e.target.value } : x,
                                ),
                              )
                            }
                            style={{ width: '100%', border: `1px solid ${c.ink150}`, background: 'var(--card-bg)', padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <select
                            value={col.suggestedType}
                            onChange={e =>
                              setColumns(prev =>
                                prev.map(x =>
                                  x.index === col.index
                                    ? {
                                        ...x,
                                        suggestedType: e.target.value as ColumnType,
                                      }
                                    : x,
                                ),
                              )
                            }
                            style={{ width: '100%', border: `1px solid ${c.ink150}`, background: 'var(--card-bg)', padding: '8px 12px', fontSize: 14 }}
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
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
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

const getTextFormatCss = (tf: SheetTextFormat | null) => {
  if (!tf) {
    return {};
  }
  const color = typeof tf.foregroundColor === 'string' ? tf.foregroundColor : undefined;
  const fontWeight = typeof tf.bold === 'boolean' ? (tf.bold ? 700 : 400) : undefined;
  const fontStyle = typeof tf.italic === 'boolean' ? (tf.italic ? 'italic' : 'normal') : undefined;
  const fontSize =
    typeof tf.fontSize === 'number' && Number.isFinite(tf.fontSize) && tf.fontSize > 0
      ? tf.fontSize
      : undefined;
  const fontFamily = typeof tf.fontFamily === 'string' && tf.fontFamily.trim() ? tf.fontFamily : undefined;
  return { color, fontWeight, fontStyle, fontSize, fontFamily };
};

const getTextDecorationLine = (tf: SheetTextFormat | null): CSSProperties['textDecorationLine'] | undefined => {
  if (!tf) {
    return undefined;
  }
  const underline = typeof tf.underline === 'boolean' ? tf.underline : undefined;
  const strikethrough = typeof tf.strikethrough === 'boolean' ? tf.strikethrough : undefined;
  if (underline === true || strikethrough === true) {
    const parts: string[] = [];
    if (underline === true) parts.push('underline');
    if (strikethrough === true) parts.push('line-through');
    return parts.join(' ') as CSSProperties['textDecorationLine'];
  }
  if (underline === false || strikethrough === false) {
    return 'none';
  }
  return undefined;
};

const sheetStyleToCss = (style: SheetCellStyle) => {
  const backgroundColor =
    typeof style.backgroundColor === 'string' ? style.backgroundColor : undefined;
  const textAlign = mapHorizontalAlignment(style.horizontalAlignment);
  const tf = style.textFormat ?? null;
  const textDecorationLine = getTextDecorationLine(tf);

  return {
    backgroundColor,
    textAlign,
    ...getTextFormatCss(tf),
    textDecorationLine,
  };
};
