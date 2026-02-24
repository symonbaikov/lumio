'use client';

import { DEFAULT_BACKGROUND } from '@/app/(main)/workspaces/constants';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import apiClient from '@/app/lib/api';
import { useIntlayer, useLocale } from 'next-intlayer';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { OnboardingNavigation } from './components/OnboardingNavigation';
import { OnboardingProgress } from './components/OnboardingProgress';
import { resolveOnboardingText } from './lib/resolveOnboardingText';
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

const DEFAULT_CURRENCY = 'USD';

type OnboardingIntegrationKey = 'dropbox' | 'googleDrive' | 'gmail' | 'googleSheets' | 'telegram';

const ONBOARDING_INTEGRATIONS: Array<{
  key: OnboardingIntegrationKey;
  apiKey: 'dropbox' | 'google-drive' | 'gmail' | 'google-sheets' | 'telegram';
  iconSrc: string;
  connectMode: 'oauth' | 'page';
  path: string;
}> = [
  {
    key: 'dropbox',
    apiKey: 'dropbox',
    iconSrc: '/icons/dropbox-icon.png',
    connectMode: 'oauth',
    path: '/integrations/dropbox',
  },
  {
    key: 'googleDrive',
    apiKey: 'google-drive',
    iconSrc: '/icons/google-drive-icon.png',
    connectMode: 'oauth',
    path: '/integrations/google-drive',
  },
  {
    key: 'gmail',
    apiKey: 'gmail',
    iconSrc: '/icons/gmail.png',
    connectMode: 'oauth',
    path: '/integrations/gmail',
  },
  {
    key: 'googleSheets',
    apiKey: 'google-sheets',
    iconSrc: '/icons/icons8-google-sheets-48.png',
    connectMode: 'page',
    path: '/integrations/google-sheets',
  },
  {
    key: 'telegram',
    apiKey: 'telegram',
    iconSrc: '/icons/icons8-telegram-48.png',
    connectMode: 'page',
    path: '/settings/telegram',
  },
];

const INTEGRATION_TITLE_FALLBACK: Record<OnboardingIntegrationKey, string> = {
  dropbox: 'Dropbox',
  googleDrive: 'Google Drive',
  gmail: 'Gmail',
  googleSheets: 'Google Sheets',
  telegram: 'Telegram',
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function detectTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function normalizeLocale(locale: string | null | undefined): SupportedLocale {
  if (locale === 'en' || locale === 'kk' || locale === 'ru') {
    return locale;
  }

  return 'ru';
}

export default function OnboardingPage() {
  const router = useRouter();
  const { setLocale, locale } = useLocale();
  const t = useIntlayer('onboardingPage' as any) as any;
  const { user, loading: authLoading, setUser } = useAuth();
  const { refreshWorkspaces } = useWorkspace();

  const { currentStep, data, updateData, goBack, goNext, skipAll, totalSteps, isLastStep } =
    useOnboardingWizard({
      locale: 'ru',
      timeZone: detectTimeZone(),
      workspaceName: '',
      workspaceCurrency: DEFAULT_CURRENCY,
      workspaceBackgroundImage: DEFAULT_BACKGROUND,
      integrationsToSetup: [],
    });

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
  >({
    dropbox: false,
    googleDrive: false,
    gmail: false,
    googleSheets: false,
    telegram: false,
  });
  const [integrationLoading, setIntegrationLoading] = useState<
    Record<OnboardingIntegrationKey, boolean>
  >({
    dropbox: false,
    googleDrive: false,
    gmail: false,
    googleSheets: false,
    telegram: false,
  });

  const checkIntegrationConnected = async (
    integration: (typeof ONBOARDING_INTEGRATIONS)[number],
  ): Promise<boolean> => {
    if (integration.apiKey === 'google-sheets') {
      const response = await apiClient.get('/google-sheets');
      const sheets = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];
      return sheets.length > 0;
    }

    const response = await apiClient.get(`/integrations/${integration.apiKey}/status`);
    const connected =
      Boolean(response.data?.connected) ||
      String(response.data?.status || '').toLowerCase() === 'connected';
    return connected;
  };

  const refreshIntegrationStatuses = async () => {
    const nextStatuses: Record<OnboardingIntegrationKey, boolean> = {
      dropbox: false,
      googleDrive: false,
      gmail: false,
      googleSheets: false,
      telegram: false,
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
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.onboardingCompletedAt) {
      router.replace('/');
    }
  }, [authLoading, router, user]);

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

    if (user.onboardingCompletedAt) {
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      setIsInitializing(true);
      setError('');

      const defaultLocale = normalizeLocale(user.locale || locale);
      const initialData: Partial<OnboardingData> = {
        locale: defaultLocale,
        timeZone: user.timeZone || detectTimeZone(),
        workspaceName: `${user.name || user.email} workspace`,
        workspaceCurrency: DEFAULT_CURRENCY,
        workspaceBackgroundImage: DEFAULT_BACKGROUND,
      };

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
          setError(
            resolveOnboardingText(
              t.errors.workspaceLoadFailed,
              'Failed to load workspace settings.',
              data.locale,
            ),
          );
        }
      } finally {
        if (!cancelled) {
          updateData(initialData);
          setLocale(defaultLocale);
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
  }, [authLoading, bootstrapComplete, locale, setLocale, t, updateData, user]);

  useEffect(() => {
    if (currentStep !== 3) {
      return;
    }

    void refreshIntegrationStatuses();

    const timer = window.setInterval(() => {
      void refreshIntegrationStatuses();
    }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, [currentStep]);

  const stepLabels = useMemo(() => {
    const resolveLabel = (token: unknown, fallback: string) => {
      const tokenValue =
        token && typeof token === 'object' && 'value' in token
          ? (token as { value?: unknown }).value
          : token;

      return resolveOnboardingText(tokenValue, fallback, data.locale);
    };

    return [
      resolveLabel(t.steps.welcome, 'Welcome'),
      resolveLabel(t.steps.language, 'Language'),
      resolveLabel(t.steps.workspace, 'Workspace'),
      resolveLabel(t.steps.integrations, 'Integrations'),
      resolveLabel(t.steps.completion, 'Done'),
    ];
  }, [
    data.locale,
    t.steps.completion,
    t.steps.integrations,
    t.steps.language,
    t.steps.welcome,
    t.steps.workspace,
  ]);

  const showSkipButton = currentStep > 0 && !isLastStep;
  const isWorkspaceLayoutStep = currentStep === 2;
  const wizardTargetMaxWidth = isWorkspaceLayoutStep && !workspaceCurrencyPickerOpen ? 1520 : 1160;
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
  }, [currentStep]);

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
  }, [currentStep, hideMainNavigation, isWorkspaceCurrencyPickerView]);

  const integrationCards = useMemo(
    () =>
      ONBOARDING_INTEGRATIONS.map(integration => ({
        key: integration.key,
        title: resolveOnboardingText(
          t.integrations.cards[integration.key].title,
          INTEGRATION_TITLE_FALLBACK[integration.key],
          data.locale,
        ),
        description: resolveOnboardingText(
          t.integrations.cards[integration.key].description,
          '',
          data.locale,
        ),
        iconSrc: integration.iconSrc,
        connected: integrationStatuses[integration.key],
        loading: integrationLoading[integration.key],
        actionLabel: integrationStatuses[integration.key]
          ? resolveOnboardingText(t.integrations.connectedBadge, 'Connected', data.locale)
          : resolveOnboardingText(
              t.integrations.cards[integration.key].action,
              'Connect',
              data.locale,
            ),
      })),
    [data.locale, integrationLoading, integrationStatuses, t],
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

    if (integration.connectMode === 'page') {
      window.open(integration.path, '_blank', 'noopener,noreferrer');
      return;
    }

    setIntegrationLoading(prev => ({ ...prev, [integration.key]: true }));

    try {
      const response = await apiClient.get(`/integrations/${integration.apiKey}/connect`);
      const url = response.data?.url;
      if (!url) {
        throw new Error('Missing OAuth URL');
      }

      const popup = window.open(url, `onboarding-${integration.apiKey}`, 'width=1100,height=760');
      if (!popup) {
        window.location.href = url;
        return;
      }

      for (let attempt = 0; attempt < 40; attempt += 1) {
        await sleep(2000);

        try {
          const connected = await checkIntegrationConnected(integration);
          if (connected) {
            if (!popup.closed) {
              popup.close();
              window.focus();
            }
            await refreshIntegrationStatuses();
            break;
          }
        } catch {
          // Keep polling while OAuth flow is running.
        }
      }
    } catch {
      setError(
        resolveOnboardingText(
          t.integrations.connectFailed,
          'Failed to connect integration.',
          data.locale,
        ),
      );
    } finally {
      setIntegrationLoading(prev => ({ ...prev, [integration.key]: false }));
    }
  };

  const completeOnboarding = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const workspaceName = data.workspaceName.trim();
      const workspaceCurrency = data.workspaceCurrency.trim().toUpperCase();
      const workspaceBackgroundImage = (data.workspaceBackgroundImage || '').trim();

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
        setUser(updatedUser);
      }

      try {
        await refreshWorkspaces();
      } catch {
        // Do not block onboarding completion if workspace refresh fails.
      }

      router.replace('/');
    } catch {
      setError(
        resolveOnboardingText(
          t.errors.completeFailed,
          'Failed to save onboarding settings.',
          data.locale,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      void completeOnboarding();
      return;
    }

    setIsStepTransitioning(true);
    goNext();
  };

  const handleBack = () => {
    setIsStepTransitioning(true);
    goBack();
  };

  const handleSkip = () => {
    setIsStepTransitioning(true);
    goNext();
  };

  const handleSkipAll = () => {
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

  if (authLoading || isInitializing || !user || user.onboardingCompletedAt) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div
        className="mx-auto w-full"
        style={{
          maxWidth: wizardTargetMaxWidth,
          transition: 'max-width 260ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className={
            isWorkspaceCurrencyPickerView
              ? 'mb-3 flex items-center justify-between'
              : 'mb-4 flex items-center justify-between'
          }
        >
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            LUMIO
          </span>
          <span className="text-xs font-semibold text-muted-foreground">
            {resolveOnboardingText(t.progressLabel, 'Step {current} of {total}', data.locale)
              .replace('{current}', String(currentStep + 1))
              .replace('{total}', String(totalSteps))}
          </span>
        </div>

        <div
          className={`rounded-3xl border border-border bg-card/95 shadow-sm backdrop-blur-sm ${
            isWorkspaceCurrencyPickerView ? 'p-4 sm:p-5' : 'p-5 sm:p-6'
          }`}
        >
          <OnboardingProgress currentStep={currentStep} stepLabels={stepLabels} />

          {error ? (
            <div className="mt-4 rounded-xl border border-[#ebd0d0] bg-[#fff4f4] px-4 py-3 text-sm text-[#8a3f3f]">
              {error}
            </div>
          ) : null}

          <div
            style={{
              height: animatedBlockHeight ? `${animatedBlockHeight}px` : undefined,
              transition: 'height 260ms cubic-bezier(0.22, 1, 0.36, 1)',
              overflow: 'hidden',
            }}
          >
            <div
              ref={stepBlockRef}
              className={
                isWorkspaceCurrencyPickerView
                  ? 'flex flex-col gap-4 pt-0'
                  : 'flex flex-col gap-6 pt-5'
              }
            >
              <div className="relative">
                <div style={{ visibility: isStepTransitioning ? 'hidden' : 'visible' }}>
                  {currentStep === 0 ? <WelcomeStep /> : null}
                  {currentStep === 1 ? (
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
                  {currentStep === 2 ? (
                    <WorkspaceStep
                      workspaceName={data.workspaceName}
                      workspaceCurrency={data.workspaceCurrency}
                      workspaceBackgroundImage={data.workspaceBackgroundImage}
                      onWorkspaceNameChange={handleWorkspaceNameChange}
                      onWorkspaceCurrencyChange={handleWorkspaceCurrencyChange}
                      onWorkspaceBackgroundImageChange={handleWorkspaceBackgroundChange}
                      onCurrencyPickerOpenChange={setWorkspaceCurrencyPickerOpen}
                    />
                  ) : null}
                  {currentStep === 3 ? (
                    <IntegrationsStep
                      cards={integrationCards}
                      onConnect={handleConnectIntegration}
                    />
                  ) : null}
                  {currentStep === 4 ? (
                    <CompletionStep
                      locale={data.locale}
                      timeZone={data.timeZone}
                      workspaceName={data.workspaceName}
                      workspaceCurrency={data.workspaceCurrency}
                      workspaceBackgroundImage={data.workspaceBackgroundImage}
                      connectedIntegrations={connectedIntegrationItems}
                    />
                  ) : null}
                </div>

                {isStepTransitioning ? (
                  <div className="absolute inset-0 rounded-2xl bg-white" />
                ) : null}
              </div>

              {!hideMainNavigation ? (
                <div>
                  <OnboardingNavigation
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    isSubmitting={isSubmitting || isStepTransitioning}
                    showSkip={showSkipButton}
                    onBack={handleBack}
                    onNext={handleNext}
                    onSkip={handleSkip}
                    onSkipAll={handleSkipAll}
                    labels={{
                      back: resolveOnboardingText(t.navigation.back, 'Back', data.locale),
                      next: resolveOnboardingText(t.navigation.next, 'Next', data.locale),
                      finish: resolveOnboardingText(
                        t.navigation.finish,
                        'Start using app',
                        data.locale,
                      ),
                      skip: resolveOnboardingText(t.navigation.skip, 'Skip', data.locale),
                      skipAll: resolveOnboardingText(t.navigation.skipAll, 'Skip all', data.locale),
                      saving: resolveOnboardingText(t.navigation.saving, 'Saving...', data.locale),
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
