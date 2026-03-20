'use client';

export const dynamic = 'force-dynamic';

import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { Alert, CircularProgress, Container, Paper, Typography } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useIntlayer('googleSheetsCallbackPage');
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const completeAuth = async () => {
      if (!code) {
        setError(t.errors.missingCode.value);
        return;
      }

      try {
        await apiClient.post('/google-sheets/oauth/callback', { code });
        setSuccess(true);
        window.setTimeout(() => {
          router.push('/integrations/google-sheets');
        }, 1200);
      } catch (err: any) {
        setError(err?.response?.data?.message || t.errors.connectFailed.value);
      }
    };

    if (oauthError) {
      setError(`${t.errors.oauthErrorPrefix.value}: ${oauthError}`);
      return;
    }

    void completeAuth();
  }, [code, oauthError, router, t]);

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          {t.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t.subtitle}
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        {success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t.success}
          </Alert>
        ) : null}

        {!error && !success ? <CircularProgress size={20} /> : null}
      </Paper>
    </Container>
  );
}

export default function GoogleSheetsCallbackPage() {
  return (
    <Suspense
      fallback={
        <Container maxWidth="sm" sx={{ mt: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Container>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
