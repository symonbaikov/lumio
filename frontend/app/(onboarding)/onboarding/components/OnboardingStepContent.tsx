'use client';

import { Box } from '@mui/material';
import React from 'react';
import type { LucideIcon } from '@/app/components/icons';
import { CompletionStep } from '../steps/CompletionStep';
import { IntegrationsStep } from '../steps/IntegrationsStep';
import { LanguageStep } from '../steps/LanguageStep';
import { WelcomeStep } from '../steps/WelcomeStep';
import { WorkspaceStep } from '../steps/WorkspaceStep';
import type { OnboardingData } from '../useOnboardingWizard';

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

type OnboardingStepContentProps = {
  currentStep: number;
  flow: OnboardingFlow;
  data: OnboardingData;
  isStepTransitioning: boolean;
  integrationCards: IntegrationCard[];
  connectedIntegrationItems: IntegrationCard[];
  updateData: (data: Partial<OnboardingData>) => void;
  setLocale: (locale: string) => void;
  onCurrencyPickerOpenChange: (open: boolean) => void;
  onConnect: (key: string) => Promise<void>;
};

export function OnboardingStepContent({
  currentStep,
  flow,
  data,
  isStepTransitioning,
  integrationCards,
  connectedIntegrationItems,
  updateData,
  setLocale,
  onCurrencyPickerOpenChange,
  onConnect,
}: OnboardingStepContentProps): React.ReactElement {
  const welcomeStepIndex = flow.stepKeys.indexOf('welcome');
  const languageStepIndex = flow.stepKeys.indexOf('language');
  const workspaceStepIndex = flow.stepKeys.indexOf('workspace');
  const integrationsStepIndex = flow.stepKeys.indexOf('integrations');
  const completionStepIndex = flow.stepKeys.indexOf('completion');

  return (
    <Box sx={{ position: 'relative' }}>
      <Box style={{ visibility: isStepTransitioning ? 'hidden' : 'visible' }}>
        {currentStep === welcomeStepIndex ? <WelcomeStep /> : null}
        {currentStep === languageStepIndex ? (
          <LanguageStep
            locale={data.locale}
            timeZone={data.timeZone}
            onLocaleChange={(nextLocale): void => {
              updateData({ locale: nextLocale });
              setLocale(nextLocale);
            }}
            onTimeZoneChange={(nextTimeZone): void => updateData({ timeZone: nextTimeZone })}
          />
        ) : null}
        {currentStep === workspaceStepIndex ? (
          <WorkspaceStep
            locale={data.locale}
            workspaceName={data.workspaceName}
            workspaceCurrency={data.workspaceCurrency}
            workspaceBackgroundImage={data.workspaceBackgroundImage}
            onWorkspaceNameChange={(name): void => updateData({ workspaceName: name })}
            onWorkspaceCurrencyChange={(currency): void =>
              updateData({ workspaceCurrency: currency })
            }
            onWorkspaceBackgroundImageChange={(bg): void =>
              updateData({ workspaceBackgroundImage: bg })
            }
            onCurrencyPickerOpenChange={onCurrencyPickerOpenChange}
          />
        ) : null}
        {currentStep === integrationsStepIndex ? (
          <IntegrationsStep cards={integrationCards} onConnect={onConnect} />
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
  );
}
