'use client';

import apiClient from '@/app/lib/api';
import { tokens } from '@/lib/theme-tokens';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  type Jurisdiction,
  type JurisdictionRate,
  flagFor,
  formatRate,
  ratesInForce,
  supportMailto,
  todayLocal,
} from './tax-jurisdiction.helpers';

interface TaxJurisdictionSectionProps {
  labels: {
    title: string;
    description: string;
    none: string;
    placeholder: string;
    ratesTitle: string;
    apply: string;
    applying: string;
    switchWarning: string;
    noRates: string;
    loadError: string;
    saveError: string;
    saved: string;
    disclaimer: string;
    reportError: string;
  };
}

function FlagIcon({ code }: { code: string }): React.ReactElement | null {
  const Flag = flagFor(code);
  if (!Flag) {
    return null;
  }
  return <Flag style={{ width: 20, height: 14, borderRadius: 2, flexShrink: 0 }} />;
}

/**
 * Picks the country a workspace files tax in.
 *
 * Kept out of WorkspaceOverviewView, which is already long: everything tax
 * related on this screen lives here, and the overview renders one element.
 */
export function TaxJurisdictionSection({
  labels,
}: TaxJurisdictionSectionProps): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [currentCode, setCurrentCode] = useState<string>('');
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [rates, setRates] = useState<JurisdictionRate[]>([]);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<'load' | 'save' | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiClient.get<Jurisdiction[]>('/tax/jurisdictions'),
      apiClient.get<{ jurisdiction: Jurisdiction | null }>('/tax/settings'),
    ])
      .then(([list, settings]) => {
        if (cancelled) {
          return;
        }
        setJurisdictions(list.data ?? []);
        const code = settings.data?.jurisdiction?.code ?? '';
        setCurrentCode(code);
        setSelectedCode(code);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed('load');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Previewed before anything is applied, so the choice is visible rather than
  // a surprise after saving.
  useEffect(() => {
    if (!selectedCode) {
      setRates([]);
      return;
    }

    let cancelled = false;
    const on = todayLocal();

    apiClient
      .get<JurisdictionRate[]>(`/tax/jurisdictions/${selectedCode}/rates?date=${on}`)
      .then(response => {
        if (!cancelled) {
          setRates(ratesInForce(response.data ?? [], on));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRates([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCode]);

  const handleApply = useCallback(async () => {
    setSaving(true);
    setFailed(null);
    setSaved(false);

    try {
      await apiClient.put('/tax/settings/jurisdiction', { code: selectedCode });
      setCurrentCode(selectedCode);
      setSaved(true);
    } catch {
      setFailed('save');
    } finally {
      setSaving(false);
    }
  }, [selectedCode]);

  const isSwitch = Boolean(currentCode) && selectedCode !== currentCode;
  const isDirty = selectedCode !== '' && selectedCode !== currentCode;
  const mailto = supportMailto('Lumio — tax rate correction');

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Stack
      spacing={2}
      sx={{
        borderRadius: tokens.radius.lg,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Box>
        <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'text.primary' }}>
          {labels.title}
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 14, color: 'text.secondary' }}>
          {labels.description}
        </Typography>
      </Box>

      {failed === 'load' ? <Alert severity="error">{labels.loadError}</Alert> : null}
      {failed === 'save' ? <Alert severity="error">{labels.saveError}</Alert> : null}
      {saved ? <Alert severity="success">{labels.saved}</Alert> : null}

      <Select
        value={selectedCode}
        onChange={event => {
          setSelectedCode(event.target.value);
          setSaved(false);
        }}
        displayEmpty
        size="small"
        inputProps={{ 'aria-label': labels.title }}
        sx={{ maxWidth: 360, borderRadius: tokens.radius.md }}
      >
        <MenuItem value="">
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {labels.placeholder}
          </Typography>
        </MenuItem>
        {jurisdictions.map(jurisdiction => (
          <MenuItem key={jurisdiction.code} value={jurisdiction.code}>
            <Stack direction="row" spacing={1} alignItems="center">
              <FlagIcon code={jurisdiction.code} />
              <span>{jurisdiction.name}</span>
              <Typography component="span" sx={{ fontSize: 13, color: 'text.secondary' }}>
                {jurisdiction.taxName}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Select>

      {isSwitch ? <Alert severity="warning">{labels.switchWarning}</Alert> : null}

      {selectedCode ? (
        <Box>
          <Typography sx={{ mb: 1, fontSize: 13, fontWeight: 600, color: 'text.primary' }}>
            {labels.ratesTitle}
          </Typography>
          {rates.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{labels.noRates}</Typography>
          ) : (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {rates.map(rate => (
                <Chip
                  key={`${rate.code}-${rate.validFrom}`}
                  size="small"
                  label={`${rate.name} · ${formatRate(rate.rate)}`}
                  variant={rate.isDefault ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          )}
        </Box>
      ) : null}

      <Box>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={!isDirty || saving}
          sx={{
            borderRadius: tokens.radius.md,
            fontWeight: 600,
            fontSize: 14,
            textTransform: 'none',
            px: 2.5,
            '&:disabled': { cursor: 'not-allowed', opacity: 0.5 },
          }}
        >
          {saving ? labels.applying : labels.apply}
        </Button>
      </Box>

      {/* Statutory figures are seeded by migration and can fall behind the law,
          so the screen says so where the numbers are shown rather than burying
          it in a help page. */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
        <Typography sx={{ fontSize: 12, lineHeight: 1.6, color: 'text.secondary' }}>
          {labels.disclaimer}
          {mailto ? (
            <>
              {' '}
              <Typography
                component="a"
                href={mailto}
                sx={{ fontSize: 12, color: 'primary.main', textDecoration: 'underline' }}
              >
                {labels.reportError}
              </Typography>
            </>
          ) : null}
        </Typography>
      </Box>
    </Stack>
  );
}
