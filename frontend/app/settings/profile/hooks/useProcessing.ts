'use client';

import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/settings/profile/profileHelpers';
import { useCallback, useEffect, useState } from 'react';

export const duplicateResolutions = ['skip', 'mark_duplicate', 'force_import'] as const;
export type DuplicateResolution = (typeof duplicateResolutions)[number];

export type ProcessingSettings = {
  categorizationThreshold: number;
  duplicateResolution: DuplicateResolution;
};

/** Mirrors the server defaults, which are the previously hardcoded values. */
const DEFAULTS: ProcessingSettings = {
  categorizationThreshold: 0.7,
  duplicateResolution: 'skip',
};

export type UseProcessingMessages = {
  loadError: string;
  saveError: string;
  savedMessage: string;
};

export type UseProcessingReturn = {
  settings: ProcessingSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
  message: string | null;
  update: (patch: Partial<ProcessingSettings>) => Promise<void>;
};

export function useProcessing(
  isAuthenticated: boolean,
  activeSection: string,
  workspaceId: string | null | undefined,
  messages: UseProcessingMessages,
): UseProcessingReturn {
  const [settings, setSettings] = useState<ProcessingSettings>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || activeSection !== 'processing' || !workspaceId) return;

    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/workspaces/${workspaceId}`);
        if (!active) return;
        setSettings({ ...DEFAULTS, ...(response.data?.settings?.processing || {}) });
      } catch (err: unknown) {
        if (active) setError(getApiErrorMessage(err, messages.loadError));
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [activeSection, isAuthenticated, workspaceId, messages.loadError]);

  const update = useCallback(
    async (patch: Partial<ProcessingSettings>) => {
      if (!workspaceId) return;

      const previous = settings;
      setSettings(current => ({ ...current, ...patch }));
      setSaving(true);
      setError(null);
      setMessage(null);

      try {
        await apiClient.patch(`/workspaces/${workspaceId}`, { processing: patch });
        setMessage(messages.savedMessage);
      } catch (err: unknown) {
        setSettings(previous);
        setError(getApiErrorMessage(err, messages.saveError));
      } finally {
        setSaving(false);
      }
    },
    [messages.saveError, messages.savedMessage, settings, workspaceId],
  );

  return { settings, loading, saving, error, message, update };
}
