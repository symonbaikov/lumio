'use client';

import type { LucideIcon } from '@/app/components/icons';
import { tokens } from '@/lib/theme-tokens';
import { Alert, Box } from '@mui/material';
import React from 'react';
import type { OnboardingData } from '../useOnboardingWizard';
import { OnboardingNavigation } from './OnboardingNavigation';
import { OnboardingProgress } from './OnboardingProgress';
import { OnboardingStepContent } from './OnboardingStepContent';

type IntegrationCard = {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  connected: boolean;
  loading: boolean;
  actionLabel: string;
};

type OnboardingFlow = {
  stepKeys: Array<'welcome' | 'language' | 'workspace' | 'integrations' | 'completion'>;
};

type NavLabels = {
  back: string;
  next: string;
  finish: string;
  skip: string;
  skipAll: string;
  saving: string;
};

type OnboardingShellProps = {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  flow: OnboardingFlow;
  data: OnboardingData;
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
  integrationCards: IntegrationCard[];
  connectedIntegrationItems: IntegrationCard[];
  navLabels: NavLabels;
  updateData: (data: Partial<OnboardingData>) => void;
  setLocale: (locale: string) => void;
  onCurrencyPickerOpenChange: (open: boolean) => void;
  onConnect: (key: string) => Promise<void>;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onSkipAll: () => void;
};

export function OnboardingShell({
  currentStep,
  totalSteps,
  stepLabels,
  flow,
  data,
  error,
  isSubmitting,
  isStepTransitioning,
  animatedBlockHeight,
  stepBlockRef,
  isWorkspaceCurrencyPickerView,
  hideMainNavigation,
  wizardTargetMaxWidth,
  showSkipButton,
  canExitOnBack,
  integrationCards,
  connectedIntegrationItems,
  navLabels,
  updateData,
  setLocale,
  onCurrencyPickerOpenChange,
  onConnect,
  onBack,
  onNext,
  onSkip,
  onSkipAll,
}: OnboardingShellProps): React.ReactElement {
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
            borderRadius: tokens.radius.xl,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
            p: isWorkspaceCurrencyPickerView ? { xs: 2, sm: 2.5 } : { xs: 2.5, sm: 3 },
          }}
        >
          <OnboardingProgress currentStep={currentStep} stepLabels={stepLabels} />

          {error ? (
            <Alert severity="error" sx={{ mt: 2 }}>
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
              <OnboardingStepContent
                currentStep={currentStep}
                flow={flow}
                data={data}
                isStepTransitioning={isStepTransitioning}
                integrationCards={integrationCards}
                connectedIntegrationItems={connectedIntegrationItems}
                updateData={updateData}
                setLocale={setLocale}
                onCurrencyPickerOpenChange={onCurrencyPickerOpenChange}
                onConnect={onConnect}
              />

              {!hideMainNavigation ? (
                <Box>
                  <OnboardingNavigation
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    isSubmitting={isSubmitting || isStepTransitioning}
                    showSkip={showSkipButton}
                    canExitOnBack={canExitOnBack}
                    onBack={onBack}
                    onNext={onNext}
                    onSkip={onSkip}
                    onSkipAll={onSkipAll}
                    labels={navLabels}
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
