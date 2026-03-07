'use client';

export const dynamic = 'force-dynamic';

import apiClient from '@/app/lib/api';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useIntlayer } from "@/app/i18n";
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

const decodeOauthState = (raw: string): Record<string, any> | null => {
  try {
    const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '==='.slice((base64.length + 3) % 4);
    const json = decodeURIComponent(escape(atob(padded)));
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useIntlayer('googleSheetsCallbackPage');
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');
  const oauthState = searchParams.get('state');

  const [sheetId, setSheetId] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [worksheetName, setWorksheetName] = useState('');
  const [redirectTo, setRedirectTo] = useState('/upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!code && !oauthError) {
      setError(t.errors.missingCode.value);
    }
    if (oauthError) {
      setError(`${t.errors.oauthErrorPrefix.value}: ${oauthError}`);
    }
  }, [code, oauthError, t]);

  useEffect(() => {
    if (!oauthState) return;
    const parsed = decodeOauthState(oauthState);
    if (!parsed) return;
    if (!sheetId && typeof parsed.sheetId === 'string') {
      setSheetId(parsed.sheetId);
    }
    if (!sheetName && typeof parsed.sheetName === 'string') {
      setSheetName(parsed.sheetName);
    }
    if (!worksheetName && typeof parsed.worksheetName === 'string') {
      setWorksheetName(parsed.worksheetName);
    }
    if (typeof parsed.from === 'string' && parsed.from.includes('integrations')) {
      setRedirectTo('/integrations/google-sheets');
    }
  }, [oauthState, sheetId, sheetName, worksheetName]);

  const handleSubmit = async () => {
    if (!code) return;
    if (!sheetId.trim()) {
      setError(t.errors.sheetIdRequired.value);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/google-sheets/oauth/callback', {
        code,
        sheetId: sheetId.trim(),
        sheetName: sheetName.trim() || undefined,
        worksheetName: worksheetName.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push(redirectTo);
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || t.errors.connectFailed.value);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          {t.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t.subtitle}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t.success}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={t.fields.sheetId.value}
            value={sheetId}
            onChange={e => setSheetId(e.target.value)}
            placeholder={t.fields.sheetIdPlaceholder.value}
            required
          />
          <TextField
            label={t.fields.connectionName.value}
            value={sheetName}
            onChange={e => setSheetName(e.target.value)}
            placeholder={t.fields.connectionNamePlaceholder.value}
          />
          <TextField
            label={t.fields.worksheet.value}
            value={worksheetName}
            onChange={e => setWorksheetName(e.target.value)}
            placeholder={t.fields.worksheetPlaceholder.value}
          />
          <Button variant="contained" onClick={handleSubmit} disabled={loading || !code}>
            {loading ? <CircularProgress size={20} /> : t.actions.save}
          </Button>
          <Button variant="text" onClick={() => router.push('/upload')}>
            {t.actions.backToUpload}
          </Button>
        </Box>
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
