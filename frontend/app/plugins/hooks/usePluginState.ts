'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { PluginKey } from '../types';

const STORAGE_KEY = 'LUMIO_PLUGINS_STATE';
const EVENT_NAME = 'lumio-plugin-state-change';
const EMPTY_PLUGIN_STATE = {} as Record<PluginKey, boolean>;

function readState(): Record<PluginKey, boolean> {
  if (typeof window === 'undefined') {
    return EMPTY_PLUGIN_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<PluginKey, boolean>) : EMPTY_PLUGIN_STATE;
  } catch {
    return EMPTY_PLUGIN_STATE;
  }
}

function writeState(state: Record<PluginKey, boolean>): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

let snapshot = readState();

function subscribe(cb: () => void): () => void {
  const handler = (): void => {
    snapshot = readState();
    cb();
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

function getSnapshot(): Record<PluginKey, boolean> {
  return snapshot;
}

function getServerSnapshot(): Record<PluginKey, boolean> {
  return EMPTY_PLUGIN_STATE;
}

export function usePluginState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isEnabled = useCallback((key: PluginKey): boolean => Boolean(state[key]), [state]);

  const toggle = useCallback((key: PluginKey): void => {
    const current = readState();
    writeState({ ...current, [key]: !current[key] });
  }, []);

  const enabledPlugins = useMemo(
    () => (Object.keys(state) as PluginKey[]).filter(k => state[k]),
    [state],
  );

  return { isEnabled, toggle, enabledPlugins };
}
