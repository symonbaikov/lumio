'use client';

import apiClient from '@/app/lib/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  type PasteMappingSelection,
  type PastePreviewData,
  buildPastePreview,
  isEditableTarget,
  parseClipboardRows,
} from '../utils/pasteUtils';
import type { CustomTableGridRow, CustomTableRowPatch } from '../utils/stylingUtils';
import { getResponseItems } from '../utils/tableHelpers';
import type { CustomTablePageColumn } from '../utils/tableTypes';
import { TabularFileError, readTabularFile } from '../utils/tabularFileReader';

function extractBatchInsertResult(
  response: { data?: Record<string, unknown> },
  fallbackCount: number,
): { normalizedRows: CustomTableGridRow[]; createdCount: number } {
  const payload = (response.data || {}) as Record<string, unknown>;
  const dataPayload = (payload.data || {}) as Record<string, unknown>;
  const createdRows = payload.rows || dataPayload.rows || payload.items || dataPayload.items || [];
  const normalizedRows = getResponseItems(createdRows);
  const createdCount = (payload.created ??
    dataPayload.created ??
    normalizedRows.length ??
    fallbackCount) as number;
  return { normalizedRows, createdCount };
}

function isTabularText(text: string): boolean {
  if (!text) {
    return false;
  }
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized.includes('\t') || normalized.split('\n').length > 1;
}

interface PasteDefaults {
  date: string;
  type: string;
  amount: string;
  currency: string;
  comment: string;
  paid: string;
  columnPrefix: string;
}

interface PasteMessages {
  noRows: string;
  missingColumnTitle: string;
  insertFailed: string;
  undoFailed: string;
  fileReadFailed: string;
}

export interface UsePasteImportReturn {
  pastePreviewOpen: boolean;
  pasteParsing: boolean;
  pasteApplying: boolean;
  pasteRawRows: string[][];
  pasteUseHeaders: boolean;
  pastePreview: PastePreviewData | null;
  pasteMapping: Record<number, PasteMappingSelection>;
  pasteEdits: Record<string, string>;
  hasMissingPasteColumnTitles: boolean;
  startPastePreview: (text: string) => void;
  startFileImport: (file: File) => Promise<void>;
  resetPastePreview: () => void;
  handlePasteHeadersToggle: (checked: boolean) => void;
  handlePasteCellChange: (rowIndex: number, sourceIndex: number, value: string) => void;
  handlePasteAdd: () => Promise<void>;
}

interface UsePasteImportParams {
  tableId: string | null;
  orderedColumns: CustomTablePageColumn[];
  pasteDefaults: PasteDefaults;
  loadTable: () => Promise<void>;
  refreshStats: () => Promise<void>;
  setRows: React.Dispatch<React.SetStateAction<CustomTableGridRow[]>>;
  /** Called after successful paste — component renders the undo toast */
  onInsertSuccess: (createdCount: number, onUndo: () => void) => void;
  messages: PasteMessages;
}

export function usePasteImport({
  tableId,
  orderedColumns,
  pasteDefaults,
  loadTable,
  refreshStats,
  setRows,
  onInsertSuccess,
  messages,
}: UsePasteImportParams): UsePasteImportReturn {
  const [pastePreviewOpen, setPastePreviewOpen] = useState(false);
  const [pasteParsing, setPasteParsing] = useState(false);
  const [pasteApplying, setPasteApplying] = useState(false);
  const [pasteRawRows, setPasteRawRows] = useState<string[][]>([]);
  const [pasteUseHeaders, setPasteUseHeaders] = useState(false);
  const [pastePreview, setPastePreview] = useState<PastePreviewData | null>(null);
  const [pasteMapping, setPasteMapping] = useState<Record<number, PasteMappingSelection>>({});
  const [pasteEdits, setPasteEdits] = useState<Record<string, string>>({});
  const pastePreviewTimerRef = useRef<number | null>(null);

  const hasMissingPasteColumnTitles = useMemo(
    () => Boolean(pastePreview?.columns.some(col => col.mode === 'new' && !col.newTitle?.trim())),
    [pastePreview],
  );

  const resetPastePreview = useCallback(() => {
    setPastePreviewOpen(false);
    setPastePreview(null);
    setPasteRawRows([]);
    setPasteUseHeaders(false);
    setPasteParsing(false);
    setPasteApplying(false);
    setPasteMapping({});
    setPasteEdits({});
    if (pastePreviewTimerRef.current) {
      window.clearTimeout(pastePreviewTimerRef.current);
      pastePreviewTimerRef.current = null;
    }
  }, []);

  const buildPreviewAsync = useCallback(
    (
      rows: string[][],
      useHeaders: boolean,
      mappingSelection: Record<number, PasteMappingSelection> | null,
      edits: Record<string, string>,
    ) => {
      setPasteParsing(true);
      if (pastePreviewTimerRef.current) {
        window.clearTimeout(pastePreviewTimerRef.current);
      }
      pastePreviewTimerRef.current = window.setTimeout(() => {
        const result = buildPastePreview({
          rawRows: rows,
          useHeaders,
          orderedColumns,
          mappingSelection,
          edits,
          defaults: pasteDefaults,
        });
        setPastePreview(result.preview);
        setPasteMapping(result.mapping);
        setPasteParsing(false);
        pastePreviewTimerRef.current = null;
      }, 0);
    },
    [orderedColumns, pasteDefaults],
  );

  /**
   * Общий вход для вставки из буфера и импорта файлом: обе дороги приводят
   * данные к матрице строк, дальше логика превью и маппинга одна и та же.
   */
  const startPreviewFromRows = useCallback(
    (rows: string[][]) => {
      if (!orderedColumns.length || !rows.length) {
        return;
      }
      setPasteRawRows(rows);
      setPastePreviewOpen(true);
      setPasteParsing(true);
      setPasteEdits({});
      window.setTimeout(() => {
        const initial = buildPastePreview({
          rawRows: rows,
          useHeaders: false,
          orderedColumns,
          mappingSelection: null,
          edits: {},
          defaults: pasteDefaults,
        });
        const shouldUseHeaders = initial.preview.headersDetected;
        if (shouldUseHeaders) {
          const withHeaders = buildPastePreview({
            rawRows: rows,
            useHeaders: true,
            orderedColumns,
            mappingSelection: null,
            edits: {},
            defaults: pasteDefaults,
          });
          setPasteUseHeaders(true);
          setPastePreview(withHeaders.preview);
          setPasteMapping(withHeaders.mapping);
        } else {
          setPasteUseHeaders(false);
          setPastePreview(initial.preview);
          setPasteMapping(initial.mapping);
        }
        setPasteParsing(false);
      }, 0);
    },
    [orderedColumns, pasteDefaults],
  );

  const startPastePreview = useCallback(
    (text: string) => {
      const { rows } = parseClipboardRows(text);
      startPreviewFromRows(rows);
    },
    [startPreviewFromRows],
  );

  const startFileImport = useCallback(
    async (file: File) => {
      try {
        const rows = await readTabularFile(file);
        startPreviewFromRows(rows);
      } catch (error) {
        console.error('Failed to read import file:', error);
        toast.error(error instanceof TabularFileError ? error.message : messages.fileReadFailed);
      }
    },
    [startPreviewFromRows, messages.fileReadFailed],
  );

  const handlePasteHeadersToggle = useCallback(
    (checked: boolean) => {
      setPasteUseHeaders(checked);
      if (!pasteRawRows.length) {
        return;
      }
      setPasteEdits({});
      buildPreviewAsync(pasteRawRows, checked, null, {});
    },
    [pasteRawRows, buildPreviewAsync],
  );

  const rebuildPasteWithState = useCallback(
    (nextMapping: Record<number, PasteMappingSelection>, nextEdits: Record<string, string>) => {
      if (!pasteRawRows.length) {
        return;
      }
      buildPreviewAsync(pasteRawRows, pasteUseHeaders, nextMapping, nextEdits);
    },
    [pasteRawRows, pasteUseHeaders, buildPreviewAsync],
  );

  const handlePasteCellChange = useCallback(
    (rowIndex: number, sourceIndex: number, value: string) => {
      setPasteEdits(prev => {
        const next = { ...prev, [`${rowIndex}:${sourceIndex}`]: value };
        rebuildPasteWithState(pasteMapping, next);
        return next;
      });
    },
    [pasteMapping, rebuildPasteWithState],
  );

  const appendRows = useCallback(
    (createdRows: CustomTableGridRow[]) => {
      setRows(prev => {
        const merged = [...prev, ...createdRows];
        const seen = new Set<string>();
        const deduped: CustomTableGridRow[] = [];
        for (const row of merged) {
          const id = row.id || String(row.rowNumber);
          if (!id || seen.has(id)) {
            continue;
          }
          seen.add(id);
          deduped.push(row);
        }
        deduped.sort((a, b) => (a.rowNumber ?? 0) - (b.rowNumber ?? 0));
        return deduped;
      });
    },
    [setRows],
  );

  const rollbackRows = useCallback(
    async (rowIds: string[]) => {
      if (!(tableId && rowIds.length)) {
        return;
      }
      try {
        await Promise.all(
          rowIds.map(rowId => apiClient.delete(`/custom-tables/${tableId}/rows/${rowId}`)),
        );
        setRows(prev => prev.filter(row => !rowIds.includes(row.id)));
        await refreshStats();
      } catch (error) {
        console.error('Failed to rollback rows:', error);
        toast.error(messages.undoFailed);
      }
    },
    [tableId, refreshStats, setRows, messages.undoFailed],
  );

  const createNewColumns = async (
    newColumns: typeof pastePreview extends null
      ? never
      : NonNullable<typeof pastePreview>['columns'],
  ): Promise<Map<string, string>> => {
    const placeholderToKey = new Map<string, string>();
    if (!newColumns.length) {
      return placeholderToKey;
    }
    const created = await Promise.all(
      newColumns.map(col =>
        apiClient.post(`/custom-tables/${tableId}/columns`, {
          title: col.newTitle?.trim(),
          type: col.newType ?? 'text',
        }),
      ),
    );
    for (let i = 0; i < created.length; i++) {
      const payload = created[i].data?.data || created[i].data;
      const key = payload?.key;
      const placeholderKey = newColumns[i]?.columnKey || '';
      if (key && placeholderKey) {
        placeholderToKey.set(placeholderKey, key);
      }
    }
    await loadTable();
    return placeholderToKey;
  };

  const buildPayloadRows = (
    dataRows: Record<string, unknown>[],
    keyMap: Map<string, string>,
  ): { data: CustomTableRowPatch }[] =>
    dataRows.map(row => {
      const data: CustomTableRowPatch = {};
      for (const [key, value] of Object.entries(row)) {
        data[keyMap.get(key) || key] = value;
      }
      return { data };
    });

  const handlePasteAdd = useCallback(async () => {
    if (!(tableId && pastePreview) || pasteApplying) {
      return;
    }
    if (!pastePreview.dataRows.length) {
      toast.error(messages.noRows);
      return;
    }
    if (pastePreview.hasErrors) {
      return;
    }

    const newColumns = pastePreview.columns.filter(col => col.mode === 'new');
    if (newColumns.some(col => !col.newTitle?.trim())) {
      toast.error(messages.missingColumnTitle);
      return;
    }

    setPasteApplying(true);
    try {
      const keyMap = await createNewColumns(newColumns);
      const payloadRows = buildPayloadRows(pastePreview.dataRows, keyMap);
      const response = await apiClient.post(`/custom-tables/${tableId}/rows/batch`, {
        rows: payloadRows,
      });
      const { normalizedRows, createdCount } = extractBatchInsertResult(
        response,
        pastePreview.dataRows.length,
      );
      if (normalizedRows.length) {
        appendRows(normalizedRows);
      }
      resetPastePreview();
      await refreshStats();
      onInsertSuccess(createdCount, () =>
        rollbackRows(normalizedRows.map(r => r.id).filter(Boolean)),
      );
    } catch (error) {
      console.error('Failed to batch insert rows:', error);
      toast.error(messages.insertFailed);
    } finally {
      setPasteApplying(false);
    }
  }, [
    tableId,
    pastePreview,
    pasteApplying,
    appendRows,
    resetPastePreview,
    loadTable,
    refreshStats,
    rollbackRows,
    onInsertSuccess,
    messages.noRows,
    messages.missingColumnTitle,
    messages.insertFailed,
  ]);

  // Global paste event listener
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (pastePreviewOpen || pasteApplying || !orderedColumns.length) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      const clipboardText = event.clipboardData?.getData('text/plain') || '';
      if (!isTabularText(clipboardText)) {
        return;
      }
      event.preventDefault();
      startPastePreview(clipboardText);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [pastePreviewOpen, pasteApplying, orderedColumns.length, startPastePreview]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (pastePreviewTimerRef.current) {
        window.clearTimeout(pastePreviewTimerRef.current);
      }
    };
  }, []);

  return {
    pastePreviewOpen,
    pasteParsing,
    pasteApplying,
    pasteRawRows,
    pasteUseHeaders,
    pastePreview,
    pasteMapping,
    pasteEdits,
    hasMissingPasteColumnTitles,
    startPastePreview,
    startFileImport,
    resetPastePreview,
    handlePasteHeadersToggle,
    handlePasteCellChange,
    handlePasteAdd,
  };
}
