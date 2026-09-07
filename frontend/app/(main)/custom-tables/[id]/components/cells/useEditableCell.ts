'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CustomTableCellValue } from '../../utils/stylingUtils';

export interface UseEditableCellOptions<T extends CustomTableCellValue> {
  /** The current persisted value for this cell. */
  initialValue: T;
  /** The row and column identifiers used when calling onUpdateCell. */
  rowId: string;
  columnKey: string;
  /** Callback to persist the new value. Throws on failure. */
  onUpdateCell: (rowId: string, columnKey: string, value: CustomTableCellValue) => Promise<void>;
  /**
   * Converts the raw string from the input element back to the typed value
   * that should be sent to onUpdateCell. Return null/undefined to signal
   * "no value". Defaults to the identity function (returns the string as-is).
   */
  parseValue?: (raw: string) => T;
  /**
   * Converts the typed initial value to the string representation shown in
   * the input element. Defaults to String(value) or '' for null/undefined.
   */
  toInputString?: (value: T) => string;
}

export interface UseEditableCellResult<_T extends CustomTableCellValue> {
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  /** The current string value shown inside the input. */
  inputValue: string;
  setInputValue: (v: string) => void;
  isSaving: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

function defaultToInputString<T extends CustomTableCellValue>(value: T): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * Encapsulates the shared state and event-handler logic for text-input–based
 * editable cell components (text, number, …).
 *
 * Date, select, and boolean cells have fundamentally different UX patterns and
 * are therefore NOT expected to use this hook.
 */
export function useEditableCell<T extends CustomTableCellValue>({
  initialValue,
  rowId,
  columnKey,
  onUpdateCell,
  parseValue,
  toInputString = defaultToInputString,
}: UseEditableCellOptions<T>): UseEditableCellResult<T> {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(() => toInputString(initialValue));
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus and select text when entering edit mode.
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(async () => {
    const parsedValue = parseValue ? parseValue(inputValue) : (inputValue as T);

    // Skip the network call when nothing has changed.
    if (parsedValue === initialValue) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    await (async () => {
      await onUpdateCell(rowId, columnKey, parsedValue);
      setIsEditing(false);
    })()
      .catch(async error => {
        console.error('Failed to update cell:', error);
        // Revert to the last persisted value on error.
        setInputValue(toInputString(initialValue));
      })
      .finally(async () => {
        setIsSaving(false);
      });
  }, [inputValue, initialValue, parseValue, onUpdateCell, rowId, columnKey, toInputString]);

  const handleCancel = useCallback(() => {
    setInputValue(toInputString(initialValue));
    setIsEditing(false);
  }, [initialValue, toInputString]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel],
  );

  return {
    isEditing,
    setIsEditing,
    inputValue,
    setInputValue,
    isSaving,
    inputRef,
    handleSave,
    handleCancel,
    handleKeyDown,
  };
}
