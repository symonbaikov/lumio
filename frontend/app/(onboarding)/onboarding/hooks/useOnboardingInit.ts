import { DEFAULT_BACKGROUND } from '@/app/(main)/workspaces/constants';
import type { User } from '@/app/hooks/useAuth';
import { DEFAULT_CURRENCY } from '@/app/lib/format-money';
import { useEffect, useRef, useState } from 'react';
import { resolveOnboardingBootstrapLocale } from '../lib/locale-bootstrap';
import type { OnboardingData } from '../useOnboardingWizard';
import {
  EMPTY_INTEGRATION_STATE,
  type OnboardingIntegrationKey,
  detectTimeZone,
  fetchWorkspaceInitialData,
  refreshAllIntegrationStatuses,
} from './useOnboardingActions';

type OnboardingFlow = {
  shouldRedirectCompletedUser: boolean;
  mode: string;
};

type UseOnboardingInitParams = {
  user: User | null;
  authLoading: boolean;
  flow: OnboardingFlow;
  appLocale: string;
  setLocale: (locale: string) => void;
  updateData: (data: Partial<OnboardingData>) => void;
  txFn: (keys: string[], fallback?: string) => string;
};

type UseOnboardingInitResult = {
  isInitializing: boolean;
  error: string;
  setError: (msg: string) => void;
  integrationStatuses: Record<OnboardingIntegrationKey, boolean>;
  refreshIntegrationStatuses: () => Promise<void>;
};

export function useOnboardingInit({
  user,
  authLoading,
  flow,
  appLocale,
  setLocale,
  updateData,
  txFn,
}: UseOnboardingInitParams): UseOnboardingInitResult {
  const [isInitializing, setIsInitializing] = useState(true);
  const [bootstrapComplete, setBootstrapComplete] = useState(false);
  const [error, setError] = useState('');
  const [integrationStatuses, setIntegrationStatuses] =
    useState<Record<OnboardingIntegrationKey, boolean>>(EMPTY_INTEGRATION_STATE);

  const refreshIntegrationStatuses = async (): Promise<void> => {
    const nextStatuses = await refreshAllIntegrationStatuses();
    setIntegrationStatuses(nextStatuses);
  };

  const isCreateWorkspaceFlow = flow.mode === 'create-workspace';

  useEffect((): void => {
    if (!user?.workspaceId) {
      return;
    }
    const currentWorkspaceId = localStorage.getItem('currentWorkspaceId');
    if (!currentWorkspaceId) {
      localStorage.setItem('currentWorkspaceId', user.workspaceId);
    }
  }, [user?.workspaceId]);

  const txFnRef = useRef(txFn);
  txFnRef.current = txFn;

  useEffect((): (() => void) => {
    if (authLoading || !user || bootstrapComplete) {
      return (): void => {};
    }
    if (user.onboardingCompletedAt && flow.shouldRedirectCompletedUser) {
      return (): void => {};
    }

    let cancelled = false;

    const resolvedLocale = resolveOnboardingBootstrapLocale(appLocale);

    const initCreate = async (): Promise<void> => {
      if (cancelled) {
        return;
      }
      const initialData: Partial<OnboardingData> = {
        locale: resolvedLocale,
        timeZone: user.timeZone || detectTimeZone(),
        workspaceName: `${user.name || user.email} workspace`,
        workspaceCurrency: DEFAULT_CURRENCY,
        workspaceBackgroundImage: DEFAULT_BACKGROUND,
      };
      updateData(initialData);
      setLocale(resolvedLocale);
      await refreshIntegrationStatuses();
      if (!cancelled) {
        setBootstrapComplete(true);
        setIsInitializing(false);
      }
    };

    const initMain = async (): Promise<void> => {
      try {
        const initialData = await fetchWorkspaceInitialData({
          userWorkspaceId: user.workspaceId,
          userLocale: appLocale,
        });
        if (!cancelled) {
          initialData.workspaceName =
            initialData.workspaceName || `${user.name || user.email} workspace`;
          initialData.timeZone = initialData.timeZone || user.timeZone || detectTimeZone();
          updateData(initialData);
          setLocale(resolvedLocale);
          await refreshIntegrationStatuses();
          setBootstrapComplete(true);
          setIsInitializing(false);
        }
      } catch {
        if (!cancelled) {
          setError(
            txFnRef.current(
              ['errors', 'workspaceLoadFailed'],
              'Failed to load workspace settings.',
            ),
          );
          setIsInitializing(false);
        }
      }
    };

    setIsInitializing(true);
    setError('');

    if (isCreateWorkspaceFlow) {
      void initCreate();
    } else {
      void initMain();
    }

    return (): void => {
      cancelled = true;
    };
  }, [
    authLoading,
    bootstrapComplete,
    flow.shouldRedirectCompletedUser,
    isCreateWorkspaceFlow,
    appLocale,
    setLocale,
    updateData,
    user,
  ]);

  return {
    isInitializing,
    error,
    setError,
    integrationStatuses,
    refreshIntegrationStatuses,
  };
}
