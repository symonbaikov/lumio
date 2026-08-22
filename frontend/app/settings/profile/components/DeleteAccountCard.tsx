'use client';

import { Alert } from '@/app/components/ui/alert';
import { Spinner } from '@/app/components/ui/spinner';
import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/settings/profile/profileHelpers';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { type FormEvent, useState } from 'react';

type Tx = (path: string[], fallback: string) => string;

export function DeleteAccountCard({ tx }: { tx: Tx }) {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await apiClient.delete('/users/me', { data: { password } });
      localStorage.clear();
      window.location.href = '/login';
    } catch (err: unknown) {
      // The server refuses while shared workspaces are still owned, and its
      // message names them — showing it verbatim is what makes it actionable.
      setError(getApiErrorMessage(err, tx(['dangerZone', 'errorFallback'], 'Could not delete')));
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ borderColor: 'error.main' }}>
      <Box sx={{ px: 2, pt: 2, pb: 0 }}>
        <Typography variant="subtitle1" fontWeight={600} color="error.main">
          {tx(['dangerZone', 'title'], 'Delete account')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {tx(
            ['dangerZone', 'description'],
            'Removes access for good. Workspaces you share with other people have to be handed over first.',
          )}
        </Typography>
      </Box>
      <CardContent>
        {error ? <Alert variant="error">{error}</Alert> : null}

        {confirming ? (
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 1.5, mt: 1 }}>
            <TextField
              type="password"
              size="small"
              autoComplete="current-password"
              label={tx(['passwordCard', 'currentPasswordLabel'], 'Current password')}
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              fullWidth
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                onClick={() => {
                  setConfirming(false);
                  setPassword('');
                  setError(null);
                }}
                disabled={busy}
              >
                {tx(['securityCard', 'cancelButton'], 'Cancel')}
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="error"
                disabled={busy || !password}
                startIcon={busy ? <Spinner size={16} /> : undefined}
              >
                {tx(['dangerZone', 'confirmButton'], 'Delete my account')}
              </Button>
            </Stack>
          </Box>
        ) : (
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
            <Button color="error" variant="outlined" onClick={() => setConfirming(true)}>
              {tx(['dangerZone', 'startButton'], 'Delete account')}
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
