'use client';

import { useCallback, useMemo, useState } from 'react';

export type SupportedLocale = 'ru' | 'en' | 'kk';

export interface OnboardingData {
  locale: SupportedLocale;
  timeZone: string | null;
  workspaceName: string;
  workspaceCurrency: string;
  workspaceBackgroundImage: string | null;
  integrationsToSetup: string[];
}

const TOTAL_STEPS = 5;
const LAST_STEP_INDEX = TOTAL_STEPS - 1;

export function useOnboardingWizard(initialData: OnboardingData) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(initialData);

  const goNext = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, LAST_STEP_INDEX));
  }, []);

  const goBack = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const skipAll = useCallback(() => {
    setCurrentStep(LAST_STEP_INDEX);
  }, []);

  const updateData = useCallback((patch: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...patch }));
  }, []);

  const isLastStep = currentStep === LAST_STEP_INDEX;

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
      totalSteps: TOTAL_STEPS,
      isLastStep,
    }),
    [currentStep, data, goBack, goNext, isLastStep, skipAll, updateData],
  );
}
