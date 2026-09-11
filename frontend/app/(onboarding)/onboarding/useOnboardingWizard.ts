'use client';

import { useCallback, useMemo, useState } from 'react';
import type { AppLocale as SupportedLocale } from '@/app/lib/locale';

export type { AppLocale as SupportedLocale } from '@/app/lib/locale';

export interface OnboardingData {
  locale: SupportedLocale;
  timeZone: string | null;
  workspaceName: string;
  workspaceCurrency: string;
  workspaceBackgroundImage: string | null;
  integrationsToSetup: string[];
}

export function useOnboardingWizard(initialData: OnboardingData, totalSteps = 5, initialStep = 0) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [data, setData] = useState<OnboardingData>(initialData);
  const lastStepIndex = totalSteps - 1;

  const goNext = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, lastStepIndex));
  }, [lastStepIndex]);

  const goBack = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const skipAll = useCallback(() => {
    setCurrentStep(lastStepIndex);
  }, [lastStepIndex]);

  const updateData = useCallback((patch: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...patch }));
  }, []);

  const isLastStep = currentStep === lastStepIndex;

  return useMemo(
    () => ({
      currentStep,
      data,
      setCurrentStep,
      setData,
      updateData,
      goNext,
      goBack,
      skipAll,
      totalSteps,
      isLastStep,
    }),
    [currentStep, data, goBack, goNext, isLastStep, skipAll, totalSteps, updateData],
  );
}
