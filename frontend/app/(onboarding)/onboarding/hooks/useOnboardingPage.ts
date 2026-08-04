import { DEFAULT_BACKGROUND } from '@/app/(main)/workspaces/constants';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer, useLocale } from '@/app/i18n';
import { DEFAULT_CURRENCY } from '@/app/lib/format-money';
import { normalizeLocale } from '@/app/lib/locale';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { resolveOnboardingFlow } from '../lib/onboarding-flow';
import { getNestedOnboardingValue, resolveOnboardingText } from '../lib/resolveOnboardingText';
import { useOnboardingWizard } from '../useOnboardingWizard';
import { useIntegrationConnect } from './useIntegrationConnect';
import { buildIntegrationCards, completeOnboarding, detectTimeZone } from './useOnboardingActions';
import { useOnboardingInit } from './useOnboardingInit';
import { useStepAnimation } from './useStepAnimation';

function makeTxFn({ t, locale }: { t: unknown; locale: string }): (path: string[]) => string {
  return (path: string[]): string =>
    resolveOnboardingText(getNestedOnboardingValue(t, path), '', normalizeLocale(locale));
}

export type OnboardingPageState = {
  flow: ReturnType<typeof resolveOnboardingFlow>;
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  data: ReturnType<typeof useOnboardingWizard>['data'];
  error: string;
  isSubmitting: boolean;
  isStepTransitioning: boolean;
  animatedBlockHeight: number | null;
  stepBlockRef: React.RefObject<HTMLDivElement | null>;
  isWorkspaceCurrencyPickerView: boolean;
  hideMainNavigation: boolean;
  wizardTargetMaxWidth: number;
  showSkipButton: boolean;
  canExitOnBack: boolean;
  integrationCards: ReturnType<typeof buildIntegrationCards>;
  connectedIntegrationItems: ReturnType<typeof buildIntegrationCards>;
  navLabels: {
    back: string;
    next: string;
    finish: string;
    skip: string;
    skipAll: string;
    saving: string;
  };
  updateData: ReturnType<typeof useOnboardingWizard>['updateData'];
  setLocale: (locale: string) => void;
  handleCurrencyPickerOpenChange: (open: boolean) => void;
  handleConnectIntegration: (key: string) => Promise<void>;
  handleBack: () => void;
  handleNext: () => void;
  handleSkip: () => void;
  handleSkipAll: () => void;
  isLoading: boolean;
};

export function useOnboardingPage(): OnboardingPageState {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setLocale, locale: appLocale } = useLocale();
  const t = useIntlayer('onboardingPage');
  const { user, loading: authLoading, setUser } = useAuth();
  const { refreshWorkspaces } = useWorkspace();
  const flow = resolveOnboardingFlow(searchParams.get('mode'), user?.onboardingCompletedAt);
  const isCreateWorkspaceFlow = flow.mode === 'create-workspace';
  const tx = useMemo(() => makeTxFn({ t, locale: appLocale }), [t, appLocale]);

  const { currentStep, data, updateData, goBack, goNext, skipAll, totalSteps, isLastStep } =
    useOnboardingWizard(
      {
        locale: normalizeLocale(appLocale),
        timeZone: detectTimeZone(),
        workspaceName: '',
        workspaceCurrency: DEFAULT_CURRENCY,
        workspaceBackgroundImage: DEFAULT_BACKGROUND,
        integrationsToSetup: [],
      },
      flow.stepKeys.length,
    );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workspaceCurrencyPickerOpen, setWorkspaceCurrencyPickerOpen] = useState(false);

  const workspaceStepIndex = flow.stepKeys.indexOf('workspace');
  const isWorkspaceLayoutStep = currentStep === workspaceStepIndex;
  const isWorkspaceCurrencyPickerView = isWorkspaceLayoutStep && workspaceCurrencyPickerOpen;
  const hideMainNavigation = isWorkspaceLayoutStep && workspaceCurrencyPickerOpen;

  const { isInitializing, error, setError, integrationStatuses, refreshIntegrationStatuses } =
    useOnboardingInit({ user, authLoading, flow, appLocale, setLocale, updateData, txFn: tx });

  const { integrationLoading, handleConnectIntegration } = useIntegrationConnect({
    refreshIntegrationStatuses,
  });

  const { animatedBlockHeight, isStepTransitioning, stepBlockRef } = useStepAnimation({
    currentStep,
    hideMainNavigation,
    isWorkspaceCurrencyPickerView,
  });

  useEffect((): void => {
    if (authLoading) {
      return;
    }
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.onboardingCompletedAt && flow.shouldRedirectCompletedUser) {
      router.replace('/dashboard');
    }
  }, [authLoading, flow.shouldRedirectCompletedUser, router, user]);

  useEffect((): (() => void) => {
    const integrationsIdx = flow.stepKeys.indexOf('integrations');
    if (currentStep !== integrationsIdx) {
      return (): void => {};
    }
    void refreshIntegrationStatuses();
    const timer = window.setInterval((): void => {
      void refreshIntegrationStatuses();
    }, 10000);
    return (): void => {
      window.clearInterval(timer);
    };
  }, [currentStep, flow.stepKeys, refreshIntegrationStatuses]);

  const stepLabels = useMemo((): string[] => {
    const labelMap = {
      welcome: tx(['steps', 'welcome']) || 'Welcome',
      language: tx(['steps', 'language']) || 'Language',
      workspace: tx(['steps', 'workspace']) || 'Workspace',
      integrations: tx(['steps', 'integrations']) || 'Integrations',
      completion: tx(['steps', 'completion']) || 'Done',
    } as const;
    return flow.stepKeys.map(stepKey => labelMap[stepKey]);
  }, [flow.stepKeys, tx]);

  const integrationCards = useMemo(
    () => buildIntegrationCards({ tx, integrationStatuses, integrationLoading }),
    [integrationLoading, integrationStatuses, tx],
  );

  const connectedIntegrationItems = useMemo(
    () => integrationCards.filter(card => card.connected),
    [integrationCards],
  );

  const handleCompleteOnboarding = useCallback(async (): Promise<void> => {
    setError('');
    setIsSubmitting(true);
    try {
      await completeOnboarding({
        data,
        isCreateWorkspaceFlow,
        refreshWorkspaces,
        setUser,
        onCreateWorkspaceDone: (): void => router.replace('/workspaces'),
        onOnboardingDone: (): void => router.replace('/dashboard'),
      });
    } catch {
      setError(tx(['errors', 'completeFailed']) || 'Failed to save onboarding settings.');
    } finally {
      setIsSubmitting(false);
    }
  }, [data, isCreateWorkspaceFlow, refreshWorkspaces, setUser, router, tx, setError]);

  const canExitOnBack = isCreateWorkspaceFlow && currentStep === 0;

  const handleNext = useCallback((): void => {
    if (isLastStep) {
      void handleCompleteOnboarding();
      return;
    }
    goNext();
  }, [isLastStep, handleCompleteOnboarding, goNext]);

  const handleBack = useCallback((): void => {
    if (canExitOnBack) {
      router.back();
      return;
    }
    goBack();
  }, [canExitOnBack, router, goBack]);

  return {
    flow,
    currentStep,
    totalSteps,
    stepLabels,
    data,
    error,
    isSubmitting,
    isStepTransitioning,
    animatedBlockHeight,
    stepBlockRef,
    isWorkspaceCurrencyPickerView,
    hideMainNavigation,
    wizardTargetMaxWidth: isWorkspaceLayoutStep && !workspaceCurrencyPickerOpen ? 1520 : 1160,
    showSkipButton: currentStep > 0 && !isLastStep,
    canExitOnBack,
    integrationCards,
    connectedIntegrationItems,
    navLabels: {
      back: tx(['navigation', 'back']) || 'Back',
      next: tx(['navigation', 'next']) || 'Next',
      finish: tx(['navigation', 'finish']) || 'Start using app',
      skip: tx(['navigation', 'skip']) || 'Skip',
      skipAll: tx(['navigation', 'skipAll']) || 'Skip all',
      saving: tx(['navigation', 'saving']) || 'Saving...',
    },
    updateData,
    setLocale,
    handleCurrencyPickerOpenChange: setWorkspaceCurrencyPickerOpen,
    handleConnectIntegration,
    handleBack,
    handleNext,
    handleSkip: goNext,
    handleSkipAll: skipAll,
    isLoading: authLoading || isInitializing || !user,
  };
}
