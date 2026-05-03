'use client';

import { useEffect, useRef } from 'react';
import { tinykeys } from 'tinykeys';

type KeyBindingMap = Record<string, (event: KeyboardEvent) => void>;

function isEditableTarget(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function useKeyboardShortcuts(bindings: KeyBindingMap, enabled = true): void {
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  useEffect(() => {
    if (!enabled) return;

    const guarded: KeyBindingMap = {};
    for (const key of Object.keys(bindingsRef.current)) {
      guarded[key] = (event: KeyboardEvent) => {
        if (isEditableTarget(event)) return;
        bindingsRef.current[key]?.(event);
      };
    }

    return tinykeys(window, guarded);
  }, [enabled]);
}
