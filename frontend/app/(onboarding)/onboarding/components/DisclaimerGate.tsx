'use client';

import apiClient from '@/app/lib/api';
import { tokens } from '@/lib/theme-tokens';
import { Alert, Box, Button, Checkbox, CircularProgress, Stack, Typography } from '@mui/material';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

interface DisclaimerStatus {
  version: string;
  accepted: boolean;
}

/**
 * Tracks whether the signed-in user has accepted the current disclaimer.
 *
 * The server decides, by comparing the stored version against the current one,
 * so bumping the text re-prompts everyone without a frontend release.
 */
export function useDisclaimerAcceptance(): {
  loading: boolean;
  accepted: boolean;
  markAccepted: () => void;
} {
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get<DisclaimerStatus>('/users/me/disclaimer')
      .then(response => {
        if (!cancelled) {
          setAccepted(response.data.accepted);
        }
      })
      .catch(() => {
        // A failed check must not become a silent bypass: leaving `accepted`
        // false keeps the gate closed and lets the user retry.
        if (!cancelled) {
          setAccepted(false);
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

  const markAccepted = useCallback(() => setAccepted(true), []);

  return { loading, accepted, markAccepted };
}

interface DisclaimerGateProps {
  title: string;
  intro: string;
  points: string[];
  consentLabel: string;
  acceptLabel: string;
  savingLabel: string;
  errorLabel: string;
  onAccepted: () => void;
}

/**
 * Blocking acknowledgement shown once, before onboarding starts.
 *
 * Deliberately not a wizard step: the wizard offers "skip" and "skip all", and
 * a disclaimer the user can skip past records nothing worth having.
 */
export function DisclaimerGate({
  title,
  intro,
  points,
  consentLabel,
  acceptLabel,
  savingLabel,
  errorLabel,
  onAccepted,
}: DisclaimerGateProps): React.ReactElement {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleAccept = async (): Promise<void> => {
    setSubmitting(true);
    setFailed(false);

    try {
      await apiClient.post('/users/me/disclaimer');
      onAccepted();
    } catch {
      // Only advance once the acceptance is actually recorded — otherwise the
      // user believes they consented and the audit trail disagrees.
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3 },
        py: { xs: 3, sm: 4 },
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 640,
          borderRadius: tokens.radius.lg,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          p: { xs: 2.5, sm: 4 },
        }}
      >
        <Stack spacing={2.5}>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 600, fontSize: { xs: 24, sm: 28 }, color: 'text.primary' }}
          >
            {title}
          </Typography>

          <Typography sx={{ fontSize: 15, lineHeight: 1.7, color: 'text.secondary' }}>
            {intro}
          </Typography>

          <Stack component="ul" spacing={1.25} sx={{ listStyle: 'disc', m: 0, pl: 2.5 }}>
            {points.map(point => (
              <Typography
                key={point}
                component="li"
                sx={{ fontSize: 14, lineHeight: 1.7, color: 'text.secondary' }}
              >
                {point}
              </Typography>
            ))}
          </Stack>

          {failed ? <Alert severity="error">{errorLabel}</Alert> : null}

          <Box
            component="label"
            sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, cursor: 'pointer' }}
          >
            <Checkbox
              checked={checked}
              onChange={event => setChecked(event.target.checked)}
              disabled={submitting}
              sx={{ p: 0, mt: '2px' }}
              inputProps={{ 'aria-label': consentLabel }}
            />
            <Typography sx={{ fontSize: 14, lineHeight: 1.6, color: 'text.primary' }}>
              {consentLabel}
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={handleAccept}
            disabled={!checked || submitting}
            sx={{
              alignSelf: 'flex-start',
              borderRadius: tokens.radius.md,
              fontWeight: 600,
              fontSize: 14,
              textTransform: 'none',
              px: 3,
              py: 1,
              '&:disabled': { cursor: 'not-allowed', opacity: 0.5 },
            }}
          >
            {submitting ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} color="inherit" />
                <span>{savingLabel}</span>
              </Stack>
            ) : (
              acceptLabel
            )}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
