'use client';

import { useCallback } from 'react';
import {
  buildPastePreview,
  type PasteMappingSelection,
  type PastePreviewData,
  parseClipboardRows,
} from '../utils/pasteUtils';
import type { CustomTablePageColumn } from '../utils/tableTypes';

interface PasteDefaults {
  date: string;
  type: string;
  amount: string;
  currency: string;
  comment: string;
  paid: string;
  columnPrefix: string;
}

interface BuildPreviewAsyncArgs {
  rows: string[][];
  useHeaders: boolean;
  mappingSelection: Record<number, PasteMappingSelection> | null;
  edits: Record<string, string>;
}

interface UsePastePreviewHandlersParams {
  pasteRawRows: string[][];
  pasteUseHeaders: boolean;
  pasteMapping: Record<number, PasteMappingSelection>;
  pastePreviewTimerRef: React.MutableRefObject<number | null>;
  orderedColumns: CustomTablePageColumn[];
  pasteDefaults: PasteDefaults;
  setPasteParsing: (v: boolean) => void;
  setPastePreview: (v: PastePreviewData | null) => void;
  setPasteMapping: (v: Record<number, PasteMappingSelection>) => void;
  setPasteUseHeaders: (v: boolean) => void;
  setPasteRawRows: (v: string[][]) => void;
  setPasteEdits: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setPastePreviewOpen: (v: boolean) => void;
}

export interface UsePastePreviewHandlersReturn {
  startPastePreview: (text: string) => void;
  handlePasteHeadersToggle: (checked: boolean) => void;
  handlePasteCellChange: (rowIndex: number, sourceIndex: number, value: string) => void;
}

export function usePastePreviewHandlers({
  pasteRawRows,
  pasteUseHeaders,
  pasteMapping,
  pastePreviewTimerRef,
  orderedColumns,
  pasteDefaults,
  setPasteParsing,
  setPastePreview,
  setPasteMapping,
  setPasteUseHeaders,
  setPasteRawRows,
  setPasteEdits,
  setPastePreviewOpen,
}: UsePastePreviewHandlersParams): UsePastePreviewHandlersReturn {
  const buildPreviewAsync = useCallback(
    ({ rows, useHeaders, mappingSelection, edits }: BuildPreviewAsyncArgs): void => {
      setPasteParsing(true);
      if (pastePreviewTimerRef.current) {
        window.clearTimeout(pastePreviewTimerRef.current);
      }
      pastePreviewTimerRef.current = window.setTimeout((): void => {
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
    [
      orderedColumns,
      pasteDefaults,
      setPasteParsing,
      setPastePreview,
      setPasteMapping,
      pastePreviewTimerRef,
    ],
  );

  const startPastePreview = useCallback(
    (text: string): void => {
      if (!orderedColumns.length) {
        return;
      }
      const { rows } = parseClipboardRows(text);
      if (!rows.length) {
        return;
      }
      setPasteRawRows(rows);
      setPastePreviewOpen(true);
      setPasteParsing(true);
      setPasteEdits({});
      window.setTimeout((): void => {
        const initial = buildPastePreview({
          rawRows: rows,
          useHeaders: false,
          orderedColumns,
          mappingSelection: null,
          edits: {},
          defaults: pasteDefaults,
        });
        if (initial.preview.headersDetected) {
          const h = buildPastePreview({
            rawRows: rows,
            useHeaders: true,
            orderedColumns,
            mappingSelection: null,
            edits: {},
            defaults: pasteDefaults,
          });
          setPasteUseHeaders(true);
          setPastePreview(h.preview);
          setPasteMapping(h.mapping);
        } else {
          setPasteUseHeaders(false);
          setPastePreview(initial.preview);
          setPasteMapping(initial.mapping);
        }
        setPasteParsing(false);
      }, 0);
    },
    [
      orderedColumns,
      pasteDefaults,
      setPasteRawRows,
      setPastePreviewOpen,
      setPasteParsing,
      setPasteEdits,
      setPasteUseHeaders,
      setPastePreview,
      setPasteMapping,
    ],
  );

  const rebuildPasteWithState = useCallback(
    (
      nextMapping: Record<number, PasteMappingSelection>,
      nextEdits: Record<string, string>,
    ): void => {
      if (!pasteRawRows.length) {
        return;
      }
      buildPreviewAsync({
        rows: pasteRawRows,
        useHeaders: pasteUseHeaders,
        mappingSelection: nextMapping,
        edits: nextEdits,
      });
    },
    [pasteRawRows, pasteUseHeaders, buildPreviewAsync],
  );

  const handlePasteHeadersToggle = useCallback(
    (checked: boolean): void => {
      setPasteUseHeaders(checked);
      if (!pasteRawRows.length) {
        return;
      }
      setPasteEdits({});
      buildPreviewAsync({
        rows: pasteRawRows,
        useHeaders: checked,
        mappingSelection: null,
        edits: {},
      });
    },
    [pasteRawRows, buildPreviewAsync, setPasteUseHeaders, setPasteEdits],
  );

  const handlePasteCellChange = useCallback(
    (rowIndex: number, sourceIndex: number, value: string): void => {
      setPasteEdits(prev => {
        const cellKey = `${rowIndex}:${sourceIndex}`;
        const next = { ...prev, [cellKey]: value };
        rebuildPasteWithState(pasteMapping, next);
        return next;
      });
    },
    [pasteMapping, rebuildPasteWithState, setPasteEdits],
  );

  return { startPastePreview, handlePasteHeadersToggle, handlePasteCellChange };
}
