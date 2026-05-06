'use client';

import { DEFAULT_BACKGROUND } from '@/app/(main)/workspaces/constants';
import { Spinner } from '@/app/components/ui/spinner';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer, useLocale } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { DEFAULT_APP_ROUTE } from '@/app/lib/default-app-route';
import { normalizeLocale, syncLocaleFromUser } from '@/app/lib/locale';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { OnboardingNavigation } from './components/OnboardingNavigation';
import { OnboardingIntegrationConnection } from './components/OnboardingIntegrationConnection';
import { OnboardingProgress } from './components/OnboardingProgress';
import {
  EMPTY_INTEGRATION_STATE,
  INTEGRATION_DESCRIPTION_FALLBACK,
  INTEGRATION_TITLE_FALLBACK,
  ONBOARDING_INTEGRATIONS,
  parseIntegrationConnectedStatus,
  type OnboardingIntegrationKey,
} from './hooks/useOnboardingActions';
import { resolveOnboardingBootstrapLocale } from './lib/locale-bootstrap';
import { resolveOnboardingFlow } from './lib/onboarding-flow';
import { getNestedOnboardingValue, resolveOnboardingText } from './lib/resolveOnboardingText';
import { CompletionStep } from './steps/CompletionStep';
import { IntegrationsStep } from './steps/IntegrationsStep';
import { LanguageStep } from './steps/LanguageStep';
import { WelcomeStep } from './steps/WelcomeStep';
import { WorkspaceStep } from './steps/WorkspaceStep';
import {
  type OnboardingData,
  type SupportedLocale,
  useOnboardingWizard,
} from './useOnboardingWizard';
import { tokens } from '@/lib/theme-tokens';

const DEFAULT_CURRENCY = 'USD';

function detectTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setLocale, locale: appLocale } = useLocale();
  const t = useIntlayer('onboardingPage');
  const { user, loading: authLoading, setUser } = useAuth();
  const { refreshWorkspaces } = useWorkspace();
  const flow = resolveOnboardingFlow(searchParams.get('mode'), user?.onboardingCompletedAt);
  const isCreateWorkspaceFlow = flow.mode === 'create-workspace';

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

  const [isInitializing, setIsInitializing] = useState(true);
  const [bootstrapComplete, setBootstrapComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [workspaceCurrencyPickerOpen, setWorkspaceCurrencyPickerOpen] = useState(false);
  const [animatedBlockHeight, setAnimatedBlockHeight] = useState<number | null>(null);
  const [isStepTransitioning, setIsStepTransitioning] = useState(false);
  const stepBlockRef = useRef<HTMLDivElement | null>(null);
  const hasStepMountedRef = useRef(false);
  const [integrationStatuses, setIntegrationStatuses] = useState<
    Record<OnboardingIntegrationKey, boolean>
  >(EMPTY_INTEGRATION_STATE);
  const [integrationLoading, setIntegrationLoading] = useState<
    Record<OnboardingIntegrationKey, boolean>
  >(EMPTY_INTEGRATION_STATE);
  const [activeIntegrationKey, setActiveIntegrationKey] =
    useState<OnboardingIntegrationKey | null>(null);
  const tx = useCallback(
    (path: string[], fallback = '', localeOverride?: string) =>
      resolveOnboardingText(
        getNestedOnboardingValue(t, path),
        fallback,
        localeOverride ?? data.locale,
      ),
    [data.locale, t],
  );

  const checkIntegrationConnected = useCallback(async (
    integration: (typeof ONBOARDING_INTEGRATIONS)[number],
  ): Promise<boolean> => {
    const response = await apiClient.get(integration.statusPath);
    return parseIntegrationConnectedStatus(response.data);
  }, []);

  const refreshIntegrationStatuses = useCallback(async () => {
    const nextStatuses: Record<OnboardingIntegrationKey, boolean> = {
      ...EMPTY_INTEGRATION_STATE,
    };

    await Promise.all(
      ONBOARDING_INTEGRATIONS.map(async integration => {
        try {
          nextStatuses[integration.key] = await checkIntegrationConnected(integration);
        } catch {
          nextStatuses[integration.key] = false;
        }
      }),
    );

    setIntegrationStatuses(nextStatuses);
  }, [checkIntegrationConnected]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.onboardingCompletedAt && flow.shouldRedirectCompletedUser) {
      router.replace(DEFAULT_APP_ROUTE);
    }
  }, [authLoading, flow.shouldRedirectCompletedUser, router, user]);

  useEffect(() => {
    if (!user?.workspaceId) {
      return;
    }

    const currentWorkspaceId = localStorage.getItem('currentWorkspaceId');
    if (!currentWorkspaceId) {
      localStorage.setItem('currentWorkspaceId', user.workspaceId);
    }
  }, [user?.workspaceId]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    if (bootstrapComplete) {
      return;
    }

    if (user.onboardingCompletedAt && flow.shouldRedirectCompletedUser) {
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      setIsInitializing(true);
      setError('');

      const resolvedAppLocale = resolveOnboardingBootstrapLocale(appLocale);
      const initialData: Partial<OnboardingData> = {
        locale: resolvedAppLocale,
        timeZone: user.timeZone || detectTimeZone(),
        workspaceName: `${user.name || user.email} workspace`,
        workspaceCurrency: DEFAULT_CURRENCY,
        workspaceBackgroundImage: DEFAULT_BACKGROUND,
      };

      if (isCreateWorkspaceFlow) {
        if (!cancelled) {
          updateData(initialData);
          setLocale(resolvedAppLocale);
          await refreshIntegrationStatuses();
          setBootstrapComplete(true);
          setIsInitializing(false);
        }
        return;
      }

      try {
        const response = await apiClient.get('/workspaces');
        const workspaces = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.data)
            ? response.data.data
            : [];
        const workspace =
          workspaces.find((item: { id?: string }) => item?.id === user.workspaceId) ||
          workspaces[0] ||
          null;

        if (workspace?.name) {
          initialData.workspaceName = workspace.name;
        }

        if (workspace?.currency) {
          initialData.workspaceCurrency = String(workspace.currency).toUpperCase();
        }

        if (workspace?.backgroundImage) {
          initialData.workspaceBackgroundImage = String(workspace.backgroundImage);
        }
      } catch {
        if (!cancelled) {
          setError(tx(['errors', 'workspaceLoadFailed'], 'Failed to load workspace settings.'));
        }
      } finally {
        if (!cancelled) {
          updateData(initialData);
          setLocale(resolvedAppLocale);
          await refreshIntegrationStatuses();
          setBootstrapComplete(true);
          setIsInitializing(false);
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    bootstrapComplete,
    flow.shouldRedirectCompletedUser,
    isCreateWorkspaceFlow,
    appLocale,
    refreshIntegrationStatuses,
    setLocale,
    t,
    updateData,
    user,
  ]);

  useEffect(() => {
    const integrationsStepIndex = flow.stepKeys.indexOf('integrations');
    if (currentStep !== integrationsStepIndex) {
      return;
    }

    void refreshIntegrationStatuses();

    const timer = window.setInterval(() => {
      void refreshIntegrationStatuses();
    }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, [currentStep, flow.stepKeys, refreshIntegrationStatuses]);

  const stepLabels = useMemo(() => {
    const stepLabelMap = {
      welcome: tx(['steps', 'welcome'], 'Welcome'),
      language: tx(['steps', 'language'], 'Language'),
      workspace: tx(['steps', 'workspace'], 'Workspace'),
      integrations: tx(['steps', 'integrations'], 'Integrations'),
      completion: tx(['steps', 'completion'], 'Done'),
    } as const;

    return flow.stepKeys.map(stepKey => stepLabelMap[stepKey]);
  }, [flow.stepKeys, tx]);

  const workspaceStepIndex = flow.stepKeys.indexOf('workspace');
  const welcomeStepIndex = flow.stepKeys.indexOf('welcome');
  const languageStepIndex = flow.stepKeys.indexOf('language');
  const integrationsStepIndex = flow.stepKeys.indexOf('integrations');
  const completionStepIndex = flow.stepKeys.indexOf('completion');
  const isIntegrationConnectionView =
    currentStep === integrationsStepIndex && activeIntegrationKey !== null;
  const showSkipButton = currentStep > 0 && !isLastStep && !isIntegrationConnectionView;
  const canExitOnBack = isCreateWorkspaceFlow && currentStep === 0;
  const isWorkspaceLayoutStep = currentStep === workspaceStepIndex;
  const wizardTargetMaxWidth = isIntegrationConnectionView
    ? 960
    : isWorkspaceLayoutStep && !workspaceCurrencyPickerOpen
      ? 1520
      : 1160;
  const isWorkspaceCurrencyPickerView = isWorkspaceLayoutStep && workspaceCurrencyPickerOpen;
  const hideMainNavigation = isWorkspaceLayoutStep && workspaceCurrencyPickerOpen;

  useLayoutEffect(() => {
    if (!hasStepMountedRef.current) {
      hasStepMountedRef.current = true;
      return;
    }

    setIsStepTransitioning(true);

    const timer = window.setTimeout(() => {
      setIsStepTransitioning(false);
    }, 370);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeIntegrationKey, currentStep]);

  useLayoutEffect(() => {
    const node = stepBlockRef.current;
    if (!node) {
      return;
    }

    let frame = 0;

    const measure = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => {
        setAnimatedBlockHeight(node.scrollHeight);
      });
    };

    measure();

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null;
    observer?.observe(node);

    window.addEventListener('resize', measure);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [activeIntegrationKey, currentStep, hideMainNavigation, isWorkspaceCurrencyPickerView]);

  const integrationCards = useMemo(
    () =>
      ONBOARDING_INTEGRATIONS.map(integration => ({
        key: integration.key,
        title: tx(
          ['integrations', 'cards', integration.key, 'title'],
          INTEGRATION_TITLE_FALLBACK[integration.key],
        ),
        description: tx(
          ['integrations', 'cards', integration.key, 'description'],
          INTEGRATION_DESCRIPTION_FALLBACK[integration.key],
        ),
        icon: integration.icon,
        connected: integrationStatuses[integration.key],
        loading: integrationLoading[integration.key],
        actionLabel: integrationStatuses[integration.key]
          ? tx(['integrations', 'connectedBadge'], 'Connected')
          : tx(['integrations', 'cards', integration.key, 'action'], 'Connect'),
      })),
    [integrationLoading, integrationStatuses, tx],
  );

  const connectedIntegrationItems = useMemo(
    () => integrationCards.filter(card => card.connected),
    [integrationCards],
  );

  const handleConnectIntegration = async (integrationKey: string) => {
    const integration = ONBOARDING_INTEGRATIONS.find(item => item.key === integrationKey);
    if (!integration) {
      return;
    }

    setIsStepTransitioning(true);
    setIntegrationLoading(prev => ({ ...prev, [integration.key]: true }));
    setActiveIntegrationKey(integration.key);
    setIntegrationLoading(prev => ({ ...prev, [integration.key]: false }));
  };

  const handleIntegrationConnectionStatusChange = useCallback(
    async () => {
      await refreshIntegrationStatuses();
    },
    [refreshIntegrationStatuses],
  );

  const completeOnboarding = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const workspaceName = data.workspaceName.trim();
      const workspaceCurrency = data.workspaceCurrency.trim().toUpperCase();
      const workspaceBackgroundImage = (data.workspaceBackgroundImage || '').trim();

      if (isCreateWorkspaceFlow) {
        const preferencesResponse = await apiClient.patch('/users/me/preferences', {
          locale: data.locale,
          timeZone: data.timeZone || null,
        });

        const updatedPreferencesUser = preferencesResponse.data?.user;
        if (updatedPreferencesUser) {
          localStorage.setItem('user', JSON.stringify(updatedPreferencesUser));
          syncLocaleFromUser(updatedPreferencesUser, { overwrite: true });
          setUser(updatedPreferencesUser);
        }

        const createWorkspaceResponse = await apiClient.post('/workspaces', {
          name: workspaceName || 'New Workspace',
          currency: workspaceCurrency || undefined,
          backgroundImage: workspaceBackgroundImage || undefined,
        });

        const createdWorkspaceId = createWorkspaceResponse.data?.id;
        if (createdWorkspaceId) {
          await apiClient.post(`/workspaces/${createdWorkspaceId}/switch`);
          localStorage.setItem('currentWorkspaceId', createdWorkspaceId);
        }

        try {
          await refreshWorkspaces();
        } catch {
          // Do not block workspace creation if refresh fails.
        }

        router.replace('/workspaces');
        return;
      }

      const response = await apiClient.patch('/users/me/onboarding', {
        locale: data.locale,
        timeZone: data.timeZone || null,
        workspaceName: workspaceName || undefined,
        workspaceCurrency: workspaceCurrency || undefined,
        workspaceBackgroundImage: workspaceBackgroundImage || undefined,
      });

      const updatedUser = response.data?.user;
      if (updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
        syncLocaleFromUser(updatedUser, { overwrite: true });
        setUser(updatedUser);
      }

      try {
        await refreshWorkspaces();
      } catch {
        // Do not block onboarding completion if workspace refresh fails.
      }

      router.replace(DEFAULT_APP_ROUTE);
    } catch {
      setError(tx(['errors', 'completeFailed'], 'Failed to save onboarding settings.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      void completeOnboarding();
      return;
    }

    if (isIntegrationConnectionView) {
      void refreshIntegrationStatuses();
      setActiveIntegrationKey(null);
    }

    setIsStepTransitioning(true);
    goNext();
  };

  const handleBack = () => {
    if (isIntegrationConnectionView) {
      setIsStepTransitioning(true);
      setActiveIntegrationKey(null);
      void refreshIntegrationStatuses();
      return;
    }

    if (canExitOnBack) {
      router.back();
      return;
    }

    setIsStepTransitioning(true);
    goBack();
  };

  const handleSkip = () => {
    setActiveIntegrationKey(null);
    setIsStepTransitioning(true);
    goNext();
  };

  const handleSkipAll = () => {
    setActiveIntegrationKey(null);
    setIsStepTransitioning(true);
    skipAll();
  };

  const handleWorkspaceNameChange = useCallback(
    (nextName: string) => {
      updateData({ workspaceName: nextName });
    },
    [updateData],
  );

  const handleWorkspaceCurrencyChange = useCallback(
    (nextCurrency: string) => {
      updateData({ workspaceCurrency: nextCurrency });
    },
    [updateData],
  );

  const handleWorkspaceBackgroundChange = useCallback(
    (nextBackgroundImage: string | null) => {
      updateData({ workspaceBackgroundImage: nextBackgroundImage });
    },
    [updateData],
  );

  if (
    authLoading ||
    isInitializing ||
    !user ||
    (user.onboardingCompletedAt && flow.shouldRedirectCompletedUser)
  ) {
    return (
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={40} color="primary" />
      </Box>
    );
  }

  return (
    <Box
      component="main"
      sx={{ minHeight: '100vh', px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 2, lg: 3 } }}
    >
      <Box
        sx={{ mx: 'auto', width: '100%' }}
        style={{
          maxWidth: wizardTargetMaxWidth,
          transition: 'max-width 260ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <Box
          sx={{
            mb: isWorkspaceCurrencyPickerView ? 1.5 : 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em' }}
            sx={{ color: 'primary.main' }}
          >
            LUMIO
          </Typography>
          <Typography style={{ fontSize: 12, fontWeight: 600 }} sx={{ color: 'text.secondary' }}>
            {tx(['progressLabel'], 'Step {current} of {total}')
              .replace('{current}', String(currentStep + 1))
              .replace('{total}', String(totalSteps))}
          </Typography>
        </Box>

        <Box
          sx={{
            borderRadius: tokens.radius.xl,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
            backdropFilter: 'blur(8px)',
            p: isWorkspaceCurrencyPickerView ? { xs: 2, sm: 2.5 } : { xs: 2.5, sm: 3 },
          }}
        >
          <OnboardingProgress currentStep={currentStep} stepLabels={stepLabels} />

          {error ? (
            <Alert
              severity="error"
              sx={{ mt: 2 }}
            >
              {error}
            </Alert>
          ) : null}

          <Box
            style={{
              height: animatedBlockHeight ? `${animatedBlockHeight}px` : undefined,
              transition: 'height 260ms cubic-bezier(0.22, 1, 0.36, 1)',
              overflow: 'hidden',
            }}
          >
            <Box
              ref={stepBlockRef}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: isWorkspaceCurrencyPickerView ? 2 : 3,
                pt: isWorkspaceCurrencyPickerView ? 0 : 2.5,
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <Box style={{ visibility: isStepTransitioning ? 'hidden' : 'visible' }}>
                  {currentStep === welcomeStepIndex ? <WelcomeStep /> : null}
                  {currentStep === languageStepIndex ? (
                    <LanguageStep
                      locale={data.locale}
                      timeZone={data.timeZone}
                      onLocaleChange={nextLocale => {
                        updateData({ locale: nextLocale });
                        setLocale(nextLocale);
                      }}
                      onTimeZoneChange={nextTimeZone => updateData({ timeZone: nextTimeZone })}
                    />
                  ) : null}
                  {currentStep === workspaceStepIndex ? (
                    <WorkspaceStep
                      locale={data.locale}
                      workspaceName={data.workspaceName}
                      workspaceCurrency={data.workspaceCurrency}
                      workspaceBackgroundImage={data.workspaceBackgroundImage}
                      onWorkspaceNameChange={handleWorkspaceNameChange}
                      onWorkspaceCurrencyChange={handleWorkspaceCurrencyChange}
                      onWorkspaceBackgroundImageChange={handleWorkspaceBackgroundChange}
                      onCurrencyPickerOpenChange={setWorkspaceCurrencyPickerOpen}
                    />
                  ) : null}
                  {currentStep === integrationsStepIndex ? (
                    activeIntegrationKey ? (
                      <OnboardingIntegrationConnection
                        integrationKey={activeIntegrationKey}
                        onConnectionStatusChange={handleIntegrationConnectionStatusChange}
                      />
                    ) : (
                      <IntegrationsStep
                        cards={integrationCards}
                        onConnect={handleConnectIntegration}
                      />
                    )
                  ) : null}
                  {currentStep === completionStepIndex ? (
                    <CompletionStep
                      locale={data.locale}
                      timeZone={data.timeZone}
                      workspaceName={data.workspaceName}
                      workspaceCurrency={data.workspaceCurrency}
                      workspaceBackgroundImage={data.workspaceBackgroundImage}
                      connectedIntegrations={connectedIntegrationItems}
                    />
                  ) : null}
                </Box>

                {isStepTransitioning ? (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      bgcolor: 'background.paper',
                    }}
                  />
                ) : null}
              </Box>

              {!hideMainNavigation ? (
                <Box>
                  <OnboardingNavigation
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    isSubmitting={isSubmitting || isStepTransitioning}
                    showSkip={showSkipButton}
                    canExitOnBack={canExitOnBack}
                    onBack={handleBack}
                    onNext={handleNext}
                    onSkip={handleSkip}
                    onSkipAll={handleSkipAll}
                    labels={{
                      back: tx(['navigation', 'back'], 'Back'),
                      next: tx(['navigation', 'next'], 'Next'),
                      finish: tx(['navigation', 'finish'], 'Start using app'),
                      skip: tx(['navigation', 'skip'], 'Skip'),
                      skipAll: tx(['navigation', 'skipAll'], 'Skip all'),
                      saving: tx(['navigation', 'saving'], 'Saving...'),
                      ...(isIntegrationConnectionView
                        ? { next: tx(['navigation', 'continue'], 'Continue') }
                        : {}),
                    }}
                    showSkipAll={!isIntegrationConnectionView}
                  />
                </Box>
              ) : null}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
