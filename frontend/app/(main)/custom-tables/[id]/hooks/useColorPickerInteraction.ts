'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { hexToRgba, parseHexFromColor } from '../utils/colorUtils';
import type { CustomTableGridRow, CustomTableRowStyles } from '../utils/stylingUtils';

interface UseColorPickerInteractionParams {
  rows: CustomTableGridRow[];
  colorPickerRowId: string | null;
  setColorPickerRowId: (id: string | null) => void;
  onUpdateRowStyle: (opts: { rowId: string; styles: CustomTableRowStyles }) => Promise<void>;
}

export interface UseColorPickerInteractionReturn {
  colorPickerValue: string;
  colorPickerAnchorPosition: { top: number; left: number } | null;
  openColorPickerForRow: (rowId: string, event: { clientX: number; clientY: number }) => void;
  handleColorPickerClose: () => void;
  handleColorPickerChange: (next: string) => void;
}

/** Заливка полупрозрачная, чтобы текст оставался читаемым в обеих темах. */
export const ROW_FILL_ALPHA = 0.15;
/** Пикер шлёт событие на каждый пиксель движения — пишем на сервер с паузой. */
export const ROW_FILL_SAVE_DELAY_MS = 250;

export function useColorPickerInteraction({
  rows,
  colorPickerRowId,
  setColorPickerRowId,
  onUpdateRowStyle,
}: UseColorPickerInteractionParams): UseColorPickerInteractionReturn {
  const [colorPickerValue, setColorPickerValue] = useState('#ff8a00');
  const [colorPickerAnchorPosition, setColorPickerAnchorPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSaveTimer = useCallback((): void => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearSaveTimer, [clearSaveTimer]);

  const openColorPickerForRow = useCallback(
    (rowId: string, event: { clientX: number; clientY: number }): void => {
      const row = rows.find(r => r.id === rowId);
      setColorPickerValue(parseHexFromColor(row?.styles?.manualFill) || '#ff8a00');
      setColorPickerRowId(rowId);
      setColorPickerAnchorPosition({ top: event.clientY, left: event.clientX });
    },
    [rows, setColorPickerRowId],
  );

  const handleColorPickerClose = useCallback((): void => {
    setColorPickerRowId(null);
    setColorPickerAnchorPosition(null);
  }, [setColorPickerRowId]);

  const handleColorPickerChange = useCallback(
    (next: string): void => {
      setColorPickerValue(next);
      if (!colorPickerRowId) {
        return;
      }
      const rowId = colorPickerRowId;
      clearSaveTimer();
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void onUpdateRowStyle({ rowId, styles: { manualFill: hexToRgba(next, ROW_FILL_ALPHA) } });
      }, ROW_FILL_SAVE_DELAY_MS);
    },
    [colorPickerRowId, clearSaveTimer, onUpdateRowStyle],
  );

  return {
    colorPickerValue,
    colorPickerAnchorPosition,
    openColorPickerForRow,
    handleColorPickerClose,
    handleColorPickerChange,
  };
}
