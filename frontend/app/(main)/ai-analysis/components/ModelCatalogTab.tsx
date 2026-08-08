'use client';

import { useIntlayer } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import { Box, Button, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import type React from 'react';
import { useMemo } from 'react';
import type { LocalModelState } from '../llm/useLocalModel';
import {
  RECOMMENDED_MODEL_ID,
  type ResolvedModel,
  fitsInBudget,
  resolveCatalog,
} from '../model-catalog';
import { useWebGpuBudget } from '../useWebGpuBudget';

function formatGb(mb: number): string {
  return `${(mb / 1024).toFixed(1)} GB`;
}

function formatTokens(tokens: number): string {
  return `${(tokens / 1024).toFixed(0)}k`;
}

interface SpecRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
}

function SpecRow({ label, value }: SpecRowProps): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, fontSize: 13 }}>
      <Typography component="span" sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        {label}
      </Typography>
      <Typography component="span" sx={{ fontSize: 13, fontWeight: 500, textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  );
}

export interface ModelCatalogTabProps {
  model: LocalModelState;
  onInstall: (modelId: string) => void;
  onCancel: () => void;
  onRemove: () => void;
}

export function ModelCatalogTab({
  model: modelState,
  onInstall,
  onCancel,
  onRemove,
}: ModelCatalogTabProps): React.JSX.Element {
  const t = useIntlayer('aiAnalysisPage');
  const { status, availableVramMB } = useWebGpuBudget();
  const models = useMemo(() => resolveCatalog(), []);
  const webGpuMissing = status === 'unsupported';

  const qualityLabel = (model: ResolvedModel): React.ReactNode => {
    if (model.russianQuality === 'good') return t.modelTab.qualityGood;
    if (model.russianQuality === 'ok') return t.modelTab.qualityOk;
    return t.modelTab.qualityPoor;
  };

  const speedLabel = (model: ResolvedModel): React.ReactNode => {
    if (model.speedTier === 'fast') return t.modelTab.speedFast;
    if (model.speedTier === 'balanced') return t.modelTab.speedBalanced;
    return t.modelTab.speedSlow;
  };

  const renderActions = (model: ResolvedModel): React.JSX.Element => {
    const isThisModel = modelState.activeModelId === model.modelId;
    const isBusy = modelState.status === 'downloading';
    // While one model downloads, the others cannot be started — a second
    // multi-gigabyte download would only compete for the same bandwidth.
    const busyElsewhere = isBusy && !isThisModel;

    if (modelState.status === 'ready' && isThisModel) {
      return (
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" color="success" label={t.modelTab.statusInstalled} />
          <Button size="small" color="inherit" onClick={onRemove}>
            {t.modelTab.actionRemove}
          </Button>
        </Stack>
      );
    }

    if (isBusy && isThisModel) {
      const percent = modelState.progress === null ? null : Math.round(modelState.progress * 100);

      return (
        <Stack spacing={1}>
          <LinearProgress
            variant={percent === null ? 'indeterminate' : 'determinate'}
            value={percent ?? undefined}
          />
          <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {modelState.progressText || `${percent ?? 0}%`}
          </Typography>
          <Button size="small" color="inherit" onClick={onCancel}>
            {t.modelTab.actionCancel}
          </Button>
        </Stack>
      );
    }

    return (
      <Button
        size="small"
        variant="outlined"
        disabled={webGpuMissing || busyElsewhere}
        onClick={() => onInstall(model.modelId)}
      >
        {t.modelTab.actionInstall}
      </Button>
    );
  };

  return (
    <Stack spacing={2.5}>
      {status === 'unsupported' ? (
        <Box
          sx={{
            border: '1px solid var(--border-color)',
            borderRadius: tokens.radius.lg,
            bgcolor: 'var(--muted)',
            p: 2,
          }}
        >
          <Typography sx={{ fontSize: 13 }}>{t.modelTab.webgpuUnsupported}</Typography>
        </Box>
      ) : null}

      {modelState.status === 'error' ? (
        <Box
          sx={{
            border: '1px solid var(--border-color)',
            borderRadius: tokens.radius.lg,
            p: 2,
          }}
        >
          <Typography sx={{ fontSize: 13 }}>
            {modelState.outOfSpace ? t.modelTab.errorOutOfSpace : t.modelTab.errorGeneric}
          </Typography>
          {modelState.error && !modelState.outOfSpace ? (
            <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', mt: 0.5 }}>
              {modelState.error}
            </Typography>
          ) : null}
        </Box>
      ) : null}

      <Stack spacing={0.5}>
        <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {t.modelTab.downloadHint}
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {t.modelTab.provisionalNote}
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' },
          gap: 2,
        }}
      >
        {models.map(model => {
          const fits = fitsInBudget(model, availableVramMB);

          return (
            <Box
              key={model.modelId}
              sx={{
                border: '1px solid var(--border-color)',
                borderRadius: tokens.radius.lg,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{model.displayName}</Typography>
                {model.modelId === RECOMMENDED_MODEL_ID ? (
                  <Chip size="small" color="primary" label={t.modelTab.badgeRecommended} />
                ) : null}
                {fits === true ? (
                  <Chip size="small" variant="outlined" label={t.modelTab.badgeFits} />
                ) : null}
                {fits === false ? (
                  <Chip size="small" color="warning" label={t.modelTab.badgeMayNotFit} />
                ) : null}
              </Box>

              <Stack spacing={0.75}>
                <SpecRow
                  label={t.modelTab.labelContext}
                  value={formatTokens(model.contextTokens)}
                />
                <SpecRow label={t.modelTab.labelVram} value={formatGb(model.vramRequiredMB)} />
                <SpecRow label={t.modelTab.labelRussian} value={qualityLabel(model)} />
                <SpecRow label={t.modelTab.labelSpeed} value={speedLabel(model)} />
                <SpecRow label={t.modelTab.labelLicense} value={model.license} />
              </Stack>

              <Box sx={{ mt: 'auto', pt: 0.5 }}>{renderActions(model)}</Box>
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}
