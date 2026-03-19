'use client';

import { useIntlayer, useLocale } from '@/app/i18n';
import { Download as DownloadIcon, Lock as LockIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import TransactionsView from '../../components/TransactionsView';
import api from '../../lib/api';

interface SharedFileAccess {
  statement: any;
  transactions: any[];
  permission: string;
  canDownload: boolean;
}

/**
 * Public page for accessing shared files
 */
export default function SharedFilePage() {
  const params = useParams();
  const token = params.token as string;
  const t = useIntlayer('sharedFilePage');
  const { locale } = useLocale();

  const [access, setAccess] = useState<SharedFileAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);

  useEffect(() => {
    loadSharedFile();
  }, [token]);

  const loadSharedFile = async (pwd?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = pwd ? { password: pwd } : {};
      const response = await api.get(`/storage/shared/${token}`, { params });

      setAccess(response.data);
      setNeedsPassword(false);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setNeedsPassword(true);
        setError(t.errors.passwordRequired.value);
      } else {
        setError(err.response?.data?.error?.message || t.errors.loadFailed.value);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = () => {
    loadSharedFile(password);
  };

  const handleDownload = async () => {
    if (!access) return;

    try {
      const params = password ? { password } : {};
      const response = await api.get(`/storage/shared/${token}/download`, {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', access.statement.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(
      locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 8, mb: 4 }}>
        <Typography align="center">{t.loading}</Typography>
      </Container>
    );
  }

  if (needsPassword) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <LockIcon sx={{ fontSize: 64, color: 'primary.main' }} />
            <Typography variant="h5" align="center">
              {t.protected.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" align="center">
              {t.protected.subtitle}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: '100%' }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label={t.protected.passwordLabel.value}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handlePasswordSubmit()}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handlePasswordSubmit}
              disabled={!password}
            >
              {t.protected.open}
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  if (error || !access) {
    return (
      <Container maxWidth="lg" sx={{ mt: 8, mb: 4 }}>
        <Alert severity="error">{error || t.errors.notFound.value}</Alert>
      </Container>
    );
  }

  const { statement, transactions, permission, canDownload } = access;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {statement.fileName}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip label={t.header.badge.value} size="small" color="info" />
          <Chip label={statement.bankName} size="small" variant="outlined" />
          <Chip
            label={`${t.permission.prefix.value}: ${getPermissionLabel(permission, t)}`}
            size="small"
          />
          {canDownload && (
            <Button
              variant="contained"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              sx={{ ml: 'auto' }}
            >
              {t.header.download}
            </Button>
          )}
        </Box>
      </Box>

      {/* File info */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(4, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              {t.cards.bank}
            </Typography>
            <Typography variant="h6">{statement.bankName}</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              {t.cards.fileSize}
            </Typography>
            <Typography variant="h6">{formatFileSize(statement.fileSize)}</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              {t.cards.transactions}
            </Typography>
            <Typography variant="h6">{transactions.length}</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              {t.cards.account}
            </Typography>
            <Typography variant="h6">
              {statement.metadata?.accountNumber || t.cards.dash.value}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Transactions */}
      {transactions.length > 0 ? (
        <Box>
          <Typography variant="h6" gutterBottom>
            {t.transactionsTitle}
          </Typography>
          <TransactionsView transactions={transactions} />
        </Box>
      ) : (
        <Alert severity="info">{t.errors.noTransactionsAccess}</Alert>
      )}
    </Container>
  );
}

const getPermissionLabel = (permission: string, t: any) => {
  switch (permission) {
    case 'view':
      return t.permission.view.value;
    case 'download':
      return t.permission.download.value;
    case 'edit':
      return t.permission.edit.value;
    default:
      return permission;
  }
};
