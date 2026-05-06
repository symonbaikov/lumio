import { useCallback, useState } from 'react';
import {
  EMPTY_INTEGRATION_STATE,
  ONBOARDING_INTEGRATIONS,
  type OnboardingIntegrationKey,
} from './useOnboardingActions';

type UseIntegrationConnectParams = {
  refreshIntegrationStatuses: () => Promise<void>;
};

type UseIntegrationConnectResult = {
  integrationLoading: Record<OnboardingIntegrationKey, boolean>;
  activeIntegrationKey: OnboardingIntegrationKey | null;
  handleConnectIntegration: (integrationKey: string) => Promise<void>;
  handleCloseIntegration: () => Promise<void>;
};

export function useIntegrationConnect({
  refreshIntegrationStatuses,
}: UseIntegrationConnectParams): UseIntegrationConnectResult {
  const [integrationLoading, setIntegrationLoading] =
    useState<Record<OnboardingIntegrationKey, boolean>>(EMPTY_INTEGRATION_STATE);
  const [activeIntegrationKey, setActiveIntegrationKey] = useState<OnboardingIntegrationKey | null>(null);

  const handleConnectIntegration = useCallback(async (integrationKey: string): Promise<void> => {
    const integration = ONBOARDING_INTEGRATIONS.find(item => item.key === integrationKey);
    if (!integration) return;

    setIntegrationLoading(prev => ({ ...prev, [integration.key]: true }));
    try {
      setActiveIntegrationKey(integration.key);
      await refreshIntegrationStatuses();
    } finally {
      setIntegrationLoading(prev => ({ ...prev, [integration.key]: false }));
    }
  }, [refreshIntegrationStatuses]);

  const handleCloseIntegration = useCallback(async (): Promise<void> => {
    setActiveIntegrationKey(null);
    await refreshIntegrationStatuses();
  }, [refreshIntegrationStatuses]);

  return {
    integrationLoading,
    activeIntegrationKey,
    handleConnectIntegration,
    handleCloseIntegration,
  };
}
