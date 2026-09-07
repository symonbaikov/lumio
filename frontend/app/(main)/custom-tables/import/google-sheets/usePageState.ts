'use client';

import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import { type WorksheetOption, getDefaultWorksheetName } from '@/app/lib/googleSheetsSelection';
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type {
  Category,
  GoogleSheetConnection,
  LayoutType,
  PreviewColumn,
  PreviewResponse,
} from './types';

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const fetchConnections = async (): Promise<GoogleSheetConnection[]> => {
  const res = await apiClient.get('/google-sheets');
  const items: GoogleSheetConnection[] = res.data?.data || res.data || [];
  return Array.isArray(items) ? items : [];
};

const fetchCategories = async (): Promise<Category[]> => {
  const res = await apiClient.get('/categories');
  const payload = res.data?.data || res.data || [];
  return Array.isArray(payload) ? payload : [];
};

const fetchWorksheets = async (sheetId: string): Promise<WorksheetOption[]> => {
  const res = await apiClient.get(`/google-sheets/spreadsheets/${sheetId}/worksheets`);
  const items: WorksheetOption[] = res.data?.data || res.data || [];
  return items;
};

// ---------------------------------------------------------------------------
// Commit payload builder
// ---------------------------------------------------------------------------

type CommitParams = {
  googleSheetId: string;
  worksheetName: string;
  range: string;
  tableName: string;
  tableDescription: string;
  categoryId: string;
  headerRowIndex: number;
  importData: boolean;
  layoutType: LayoutType;
  columns: PreviewColumn[];
};

const buildCommitPayload = (p: CommitParams): Record<string, unknown> => ({
  googleSheetId: p.googleSheetId,
  worksheetName: p.worksheetName.trim() || undefined,
  range: p.range.trim() || undefined,
  name: p.tableName.trim(),
  description: p.tableDescription.trim() || undefined,
  categoryId: p.categoryId || undefined,
  headerRowIndex: p.headerRowIndex,
  importData: p.importData,
  layoutType: p.layoutType,
  columns: p.columns.map(c => ({
    index: c.index,
    title: c.title,
    type: c.suggestedType,
    include: c.include,
  })),
});

// ---------------------------------------------------------------------------
// Job poller state handler
// ---------------------------------------------------------------------------

type PollHandlerArgs = {
  payload: Record<string, unknown>;
  cancelled: boolean;
  setJobStatus: (v: string) => void;
  setJobProgress: (v: number) => void;
  setJobStage: (v: string) => void;
  setJobError: (v: string) => void;
};

type PollResult = { status: string; tableId?: string; errorMsg?: string; shouldContinue: boolean };

const extractPollResult = ({
  payload,
  cancelled,
  setJobStatus,
  setJobProgress,
  setJobStage,
  setJobError,
}: PollHandlerArgs): PollResult => {
  if (cancelled) {
    return { status: '', shouldContinue: false };
  }
  const p = payload;
  const status = String(p?.status || '');
  setJobStatus(status);
  setJobProgress(typeof p?.progress === 'number' ? (p.progress as number) : 0);
  setJobStage(String(p?.stage || ''));
  setJobError(String(p?.error || ''));
  const tableId = (p?.result as Record<string, unknown>)?.tableId as string | undefined;
  const errorMsg = p?.error ? String(p.error) : undefined;
  return { status, tableId, errorMsg, shouldContinue: status !== 'done' && status !== 'failed' };
};

// ---------------------------------------------------------------------------
// Page state hook
// ---------------------------------------------------------------------------

export type PageMessages = {
  loadConnectionsFailed: string;
  oauthRequired: string;
  previewReady: string;
  previewFailed: string;
  importStartFailed: string;
  importStarted: string;
  importFailed: string;
  importDone: string;
  importError: string;
  defaultTableName: string;
};

export type PageStateReturn = {
  connections: GoogleSheetConnection[];
  loadingConnections: boolean;
  categories: Category[];
  categoryId: string;
  setCategoryId: (v: string) => void;
  googleSheetId: string;
  setGoogleSheetId: (v: string) => void;
  worksheetName: string;
  setWorksheetName: React.Dispatch<React.SetStateAction<string>>;
  worksheetOptions: WorksheetOption[];
  loadingWorksheets: boolean;
  range: string;
  setRange: (v: string) => void;
  layoutType: LayoutType;
  setLayoutType: (v: LayoutType) => void;
  headerRowIndex: number;
  setHeaderRowIndex: (v: number) => void;
  preview: PreviewResponse | null;
  setPreview: (v: PreviewResponse | null) => void;
  columns: PreviewColumn[];
  setColumns: React.Dispatch<React.SetStateAction<PreviewColumn[]>>;
  tableName: string;
  setTableName: React.Dispatch<React.SetStateAction<string>>;
  tableDescription: string;
  setTableDescription: (v: string) => void;
  importData: boolean;
  setImportData: (v: boolean) => void;
  loadingPreview: boolean;
  committing: boolean;
  jobId: string;
  jobStatus: string;
  jobProgress: number;
  jobStage: string;
  jobError: string;
  selectedConnection: GoogleSheetConnection | null;
  canPreview: boolean;
  canCommit: boolean;
  handlePreview: () => void;
  handleCommit: () => void;
  resetConnection: () => void;
};

import type React from 'react';

export const usePageState = (msgs: PageMessages): PageStateReturn => {
  const router = useRouter();

  const [connections, setConnections] = useState<GoogleSheetConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
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
    () => connections.find(c => c.id === googleSheetId) ?? null,
    [connections, googleSheetId],
  );
  const canPreview = Boolean(googleSheetId && selectedConnection?.oauthConnected !== false);
  const canCommit = Boolean(preview && tableName.trim() && columns.some(c => c.include));

  // Initial load
  const loadInitial = useEffectEvent(() => {
    setLoadingConnections(true);
    void fetchConnections()
      .then(setConnections)
      .catch(() => toast.error(msgs.loadConnectionsFailed))
      .finally(() => setLoadingConnections(false));
    void fetchCategories()
      .then(setCategories)
      .catch(() => {});
  });
  useEffect(() => {
    loadInitial();
  }, []);

  // Connection change effect
  useEffect(() => {
    if (!selectedConnection) {
      return;
    }
    setWorksheetName(prev => prev || selectedConnection.worksheetName || '');
    setTableName(prev => prev || selectedConnection.sheetName || msgs.defaultTableName);
  }, [selectedConnection, msgs.defaultTableName]);

  // Worksheet load
  useEffect(() => {
    if (!selectedConnection?.sheetId || selectedConnection.oauthConnected === false) {
      setWorksheetOptions([]);
      return;
    }
    setLoadingWorksheets(true);
    void fetchWorksheets(selectedConnection.sheetId)
      .then(items => {
        setWorksheetOptions(items);
        setWorksheetName(cur =>
          getDefaultWorksheetName(cur || selectedConnection.worksheetName || '', items),
        );
      })
      .catch(() => setWorksheetOptions([]))
      .finally(() => setLoadingWorksheets(false));
  }, [selectedConnection]);

  // Job poller
  useEffect(() => {
    if (!jobId) {
      return;
    }
    let cancelled = false;
    let timer: number | null = null;
    const handlePollResult = (result: PollResult): void => {
      if (result.status === 'done') {
        toast.success(msgs.importDone);
        router.push(result.tableId ? `/custom-tables/${result.tableId}` : '/custom-tables');
      }
      if (result.status === 'failed') {
        toast.error(result.errorMsg || msgs.importError);
      }
    };
    const poll = (): void => {
      void apiClient
        .get(`/custom-tables/import/jobs/${jobId}`)
        .then(res => {
          const payload = res.data?.data || res.data;
          const result = extractPollResult({
            payload,
            cancelled,
            setJobStatus,
            setJobProgress,
            setJobStage,
            setJobError,
          });
          if (!result.shouldContinue) {
            handlePollResult(result);
            return;
          }
          timer = window.setTimeout(poll, 1500);
        })
        .catch(() => {
          if (!cancelled) {
            timer = window.setTimeout(poll, 1500);
          }
        });
    };
    poll();
    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [jobId, router, msgs.importDone, msgs.importError]);

  const handlePreview = (): void => {
    if (!googleSheetId) {
      return;
    }
    if (selectedConnection?.oauthConnected === false) {
      toast.error(msgs.oauthRequired);
      return;
    }
    setLoadingPreview(true);
    const params = {
      googleSheetId,
      worksheetName: worksheetName.trim() || undefined,
      range: range.trim() || undefined,
      headerRowIndex,
      layoutType,
    };
    void apiClient
      .post('/custom-tables/import/google-sheets/preview', params)
      .then(res => {
        const data: PreviewResponse = res.data?.data || res.data;
        setPreview(data);
        setColumns(data.columns || []);
        setHeaderRowIndex(data.headerRowIndex ?? headerRowIndex);
        if (!tableName.trim()) {
          setTableName(selectedConnection?.sheetName || msgs.defaultTableName);
        }
        toast.success(msgs.previewReady);
      })
      .catch((err: unknown) => toast.error(getApiErrorMessage(err, msgs.previewFailed)))
      .finally(() => setLoadingPreview(false));
  };

  const handleCommit = (): void => {
    if (!(preview && canCommit)) {
      return;
    }
    setCommitting(true);
    const payload = buildCommitPayload({
      googleSheetId,
      worksheetName,
      range,
      tableName,
      tableDescription,
      categoryId,
      headerRowIndex,
      importData,
      layoutType,
      columns,
    });
    void apiClient
      .post('/custom-tables/import/google-sheets/commit', payload)
      .then(res => {
        const result = res.data?.data || res.data;
        if (!result?.jobId) {
          toast.error(msgs.importStartFailed);
          return;
        }
        setJobId(result.jobId);
        setJobStatus('pending');
        setJobProgress(0);
        setJobStage('queued');
        setJobError('');
        toast.success(msgs.importStarted);
      })
      .catch((err: unknown) => toast.error(getApiErrorMessage(err, msgs.importFailed)))
      .finally(() => setCommitting(false));
  };

  const resetConnection = (): void => {
    setPreview(null);
    setColumns([]);
    setWorksheetOptions([]);
    setWorksheetName('');
  };

  return {
    connections,
    loadingConnections,
    categories,
    categoryId,
    setCategoryId,
    googleSheetId,
    setGoogleSheetId,
    worksheetName,
    setWorksheetName,
    worksheetOptions,
    loadingWorksheets,
    range,
    setRange,
    layoutType,
    setLayoutType,
    headerRowIndex,
    setHeaderRowIndex,
    preview,
    setPreview,
    columns,
    setColumns,
    tableName,
    setTableName,
    tableDescription,
    setTableDescription,
    importData,
    setImportData,
    loadingPreview,
    committing,
    jobId,
    jobStatus,
    jobProgress,
    jobStage,
    jobError,
    selectedConnection,
    canPreview,
    canCommit,
    handlePreview,
    handleCommit,
    resetConnection,
  };
};
