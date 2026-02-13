import { useEffect, useRef } from 'react';

type UseAutoSaveOptions<T> = {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
  isEqual?: (a: T, b: T) => boolean;
};

const defaultIsEqual = <T>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 500,
  enabled = true,
  isEqual = defaultIsEqual,
}: UseAutoSaveOptions<T>): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(data);
  const initializedRef = useRef(false);
  const wasEnabledRef = useRef(enabled);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      initializedRef.current = false;
      wasEnabledRef.current = false;
      return;
    }

    if (!wasEnabledRef.current || !initializedRef.current) {
      lastSavedRef.current = data;
      initializedRef.current = true;
      wasEnabledRef.current = true;
      return;
    }

    if (isEqual(data, lastSavedRef.current)) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      await onSave(data);
      lastSavedRef.current = data;
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [data, debounceMs, enabled, isEqual, onSave]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
}
