'use client';

import {
  Alert,
  Box,
  CircularProgress,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { Suspense } from 'react';
import { sharedMuiTabsSx } from '@/app/components/ui/mui-tabs';
import { useIntlayer } from '@/app/i18n';
import { AccuracyBanner } from './components/AccuracyBanner';
import { DataCheckStep } from './components/DataCheckStep';
import { DraftStep } from './components/DraftStep';
import { ExportStep } from './components/ExportStep';
import { MappingStep } from './components/MappingStep';
import { ProfileStep } from './components/ProfileStep';
import { TaxDisclaimerGate } from './components/TaxDisclaimerGate';
import { useTaxDeclaration } from './hooks/useTaxDeclaration';
import {
  parseStep,
  parseTaxYear,
  STEPS,
  type StepKey,
  taxYearOptions,
} from './tax-declaration.helpers';

function Loading(): React.ReactElement {
  return (
    <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
      <CircularProgress size={28} />
    </Box>
  );
}

function TaxDeclarationContent(): React.ReactElement {
  const t = useIntlayer('taxDeclarationPage');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Step and year live in the URL so a reload or a shared link lands on the same view.
  const step = parseStep(searchParams.get('step'));
  const taxYear = parseTaxYear(searchParams.get('year'));
  const updateQuery = (patch: Record<string, string>): void => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const state = useTaxDeclaration(taxYear);
  const { disclaimer, profile, mappings, draft } = state;
  const accepted = disclaimer.data?.accepted === true;

  const stepLabels: Record<StepKey, React.ReactNode> = {
    profile: t.stepProfile,
    data: t.stepData,
    mapping: t.stepMapping,
    draft: t.stepDraft,
    export: t.stepExport,
  };

  const renderStep = (): React.ReactNode => {
    if (profile.isError) return <Alert severity="error">{t.loadError}</Alert>;
    if (!profile.data) return <Loading />;

    if (step === 'profile' || !profile.data.country) {
      return (
        <ProfileStep
          key={taxYear}
          profile={profile.data}
          saving={state.saveProfile.isPending}
          onSave={(taxpayerType, details) => state.saveProfile.mutate({ taxpayerType, details })}
          onNext={() => updateQuery({ step: 'data' })}
        />
      );
    }

    if (step === 'mapping') {
      if (mappings.isError) return <Alert severity="error">{t.loadError}</Alert>;
      if (!mappings.data) return <Loading />;
      return (
        <MappingStep
          mappings={mappings.data}
          saving={state.saveMappings.isPending}
          onSave={entries => state.saveMappings.mutate(entries)}
        />
      );
    }

    if (draft.isError) return <Alert severity="error">{t.loadError}</Alert>;
    if (!draft.data) return <Loading />;

    if (step === 'data') {
      return (
        <DataCheckStep
          completeness={draft.data.completeness}
          onGoToStep={next => updateQuery({ step: next })}
        />
      );
    }
    if (step === 'draft') {
      return <DraftStep draft={draft.data} />;
    }
    return (
      <ExportStep
        draft={draft.data}
        downloading={state.download.isPending}
        busy={state.finalize.isPending || state.reopen.isPending}
        onDownload={format => state.download.mutate(format)}
        onFinalize={() => state.finalize.mutate()}
        onReopen={() => state.reopen.mutate()}
      />
    );
  };

  const renderBody = (): React.ReactNode => {
    if (disclaimer.isError) return <Alert severity="error">{t.loadError}</Alert>;
    if (!disclaimer.data) return <Loading />;
    if (!accepted) {
      return (
        <TaxDisclaimerGate
          accepting={state.acceptDisclaimer.isPending}
          failed={state.acceptDisclaimer.isError}
          onAccept={() => state.acceptDisclaimer.mutate()}
        />
      );
    }

    return (
      <Stack spacing={2.5}>
        <AccuracyBanner score={draft.data?.completeness.score ?? null} />

        {state.actionError ? (
          <Alert severity="error">
            {state.actionError === 'forbidden' ? t.forbidden : t.actionError}
          </Alert>
        ) : null}

        <Box sx={{ borderBottom: '1px solid var(--border)' }}>
          <Tabs
            value={step}
            // eslint-disable-next-line max-params
            onChange={(_event, value: StepKey) => updateQuery({ step: value })}
            variant="scrollable"
            scrollButtons={false}
            sx={sharedMuiTabsSx}
          >
            {STEPS.map(key => (
              <Tab key={key} value={key} label={stepLabels[key]} />
            ))}
          </Tabs>
        </Box>

        <Box>{renderStep()}</Box>
      </Stack>
    );
  };

  return (
    <Box component="main" sx={{ px: { xs: 2, md: 4 }, py: 3, width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
          flexWrap: 'wrap',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {t.title}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            {t.subtitle}
          </Typography>
        </Box>
        {accepted ? (
          <TextField
            select
            size="small"
            label={t.taxYearLabel.value}
            value={taxYear}
            onChange={event => updateQuery({ year: event.target.value })}
            sx={{ minWidth: 140 }}
          >
            {taxYearOptions().map(year => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
      </Box>

      {renderBody()}
    </Box>
  );
}

export default function TaxDeclarationPage(): React.ReactElement {
  // useSearchParams needs a Suspense boundary for the static render of the route.
  return (
    <Suspense fallback={<Loading />}>
      <TaxDeclarationContent />
    </Suspense>
  );
}
