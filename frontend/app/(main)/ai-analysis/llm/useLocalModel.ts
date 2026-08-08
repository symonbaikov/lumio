'use client';

import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { useCallback, useEffect, useRef, useState } from 'react';
import { buildProxiedAppConfig } from './model-source';

export type ModelStatus = 'idle' | 'downloading' | 'ready' | 'error';

export interface LocalModelState {
  status: ModelStatus;
  /** 0..1, or null while the runtime has not reported progress yet. */
  progress: number | null;
  progressText: string | null;
  /** Set when status is 'error'. Quota exhaustion is reported separately. */
  error: string | null;
  outOfSpace: boolean;
  /** The model this state describes: downloading, ready, or failed. */
  activeModelId: string | null;
}

const INITIAL: LocalModelState = {
  status: 'idle',
  progress: null,
  progressText: null,
  error: null,
  outOfSpace: false,
  activeModelId: null,
};

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

/**
 * Asks the browser to keep the weights. Without this a multi-gigabyte download
 * sits in evictable storage and can vanish, forcing a full re-download.
 */
async function requestPersistentStorage(): Promise<void> {
  if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
    await navigator.storage.persist();
  }
}

export function useLocalModel() {
  const [state, setState] = useState<LocalModelState>(INITIAL);
  const engineRef = useRef<MLCEngineInterface | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const cancelledRef = useRef(false);

  const unload = useCallback(async (): Promise<void> => {
    await engineRef.current?.unload();
    engineRef.current = null;
    workerRef.current?.terminate();
    workerRef.current = null;
    setState(INITIAL);
  }, []);

  /**
   * Terminating the worker is the only way to stop a download in flight —
   * WebLLM's engine factory takes no abort signal. Already-downloaded shards
   * stay in the browser cache, so resuming later does not start from zero.
   */
  const cancel = useCallback((): void => {
    cancelledRef.current = true;
    workerRef.current?.terminate();
    workerRef.current = null;
    engineRef.current = null;
    setState(INITIAL);
  }, []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const load = useCallback(async (modelId: string): Promise<void> => {
    cancelledRef.current = false;
    setState({ ...INITIAL, status: 'downloading', activeModelId: modelId });

    try {
      await requestPersistentStorage();

      const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');

      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;

      const engine = await CreateWebWorkerMLCEngine(worker, modelId, {
        appConfig: buildProxiedAppConfig([modelId]),
        initProgressCallback: report => {
          if (cancelledRef.current) {
            return;
          }
          setState(previous => ({
            ...previous,
            progress: report.progress,
            progressText: report.text,
          }));
        },
      });

      if (cancelledRef.current) {
        await engine.unload();
        return;
      }

      engineRef.current = engine;
      setState({
        status: 'ready',
        progress: 1,
        progressText: null,
        error: null,
        outOfSpace: false,
        activeModelId: modelId,
      });
    } catch (error) {
      workerRef.current?.terminate();
      workerRef.current = null;

      // A cancel terminates the worker, which surfaces here as a failure.
      // That is the user's own action, not an error worth reporting.
      if (cancelledRef.current) {
        return;
      }

      setState({
        ...INITIAL,
        status: 'error',
        outOfSpace: isQuotaError(error),
        error: error instanceof Error ? error.message : String(error),
        activeModelId: modelId,
      });
    }
  }, []);

  return { ...state, engine: engineRef.current, load, unload, cancel };
}
