'use client';

import { useAuth } from '@/app/hooks/useAuth';
import { usePermissions } from '@/app/hooks/usePermissions';
import { useIntlayer, useLocale } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import {
  AccessTime,
  CheckCircleOutline,
  ErrorOutline,
  Send,
  Telegram as TelegramIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

type ReportStatus = 'pending' | 'sent' | 'failed';
type ReportType = 'daily' | 'monthly' | 'custom';

interface TelegramReport {
  id: string;
  chatId: string;
  reportType: ReportType;
  reportDate: string;
  status: ReportStatus;
  sentAt?: string | null;
  createdAt: string;
}

export default function TelegramSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { hasPermission } = usePermissions();
  const t = useIntlayer('settingsTelegramPage');
  const { locale } = useLocale();

  const [chatId, setChatId] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<TelegramReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [sendingDaily, setSendingDaily] = useState(false);
  const [sendingMonthly, setSendingMonthly] = useState(false);

  useEffect(() => {
    if (user) {
      setChatId(user.telegramChatId || '');
      setTelegramId(user.telegramId || '');
    }
  }, [user]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoadingReports(true);
      const response = await apiClient.get('/telegram/reports');
      setReports(response.data.data || response.data || []);
    } catch (err) {
      console.error('Failed to load telegram reports', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const connectTelegram = async () => {
    if (!chatId) {
      setError(t.errors.chatIdRequired.value);
      return;
    }

    try {
      setLoading(true);
      setStatusMessage(null);
      setError(null);
      await apiClient.post('/telegram/connect', { chatId, telegramId: telegramId || undefined });
      setStatusMessage(t.messages.connected.value);
    } catch (err: any) {
      const message = err?.response?.data?.message || t.errors.connectFailed.value;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const sendReport = async (type: ReportType) => {
    const setSending = type === 'daily' ? setSendingDaily : setSendingMonthly;
    setSending(true);
    setError(null);
    setStatusMessage(null);

    try {
      await apiClient.post('/telegram/send-report', {
        reportType: type,
        chatId: chatId || undefined,
      });
      setStatusMessage(t.messages.sent.value);
      await loadReports();
    } catch (err: any) {
      const message = err?.response?.data?.message || t.errors.sendFailed.value;
      setError(message);
    } finally {
      setSending(false);
    }
  };

  const canView = useMemo(() => hasPermission('telegram.view'), [hasPermission]);

  if (authLoading) {
    return (
      <Container
        maxWidth={false}
        className="container-shared"
        sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth={false} className="container-shared" sx={{ mt: 6 }}>
        <Alert severity="warning">{t.authRequired}</Alert>
      </Container>
    );
  }

  if (!canView) {
    return (
      <Container maxWidth={false} className="container-shared" sx={{ mt: 6 }}>
        <Alert severity="warning">{t.permissionRequired}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} className="container-shared" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
            {t.title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t.subtitle}
          </Typography>
        </Box>

        {(statusMessage || error) && (
          <Box>
            {statusMessage && (
              <Alert severity="success" sx={{ mb: 1 }}>
                {statusMessage}
              </Alert>
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        )}

        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t.connect.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                {t.connect.steps}
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label={t.connect.chatIdLabel.value}
                placeholder={t.connect.chatIdPlaceholder.value}
                value={chatId}
                onChange={e => setChatId(e.target.value)}
                helperText={t.connect.chatIdHelp.value}
              />
              <TextField
                fullWidth
                label={t.connect.telegramIdLabel.value}
                placeholder={t.connect.telegramIdPlaceholder.value}
                value={telegramId}
                onChange={e => setTelegramId(e.target.value)}
                helperText={t.connect.telegramIdHelp.value}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                startIcon={<CheckCircleOutline />}
                onClick={connectTelegram}
                disabled={loading}
              >
                {t.connect.save}
              </Button>
              {user?.telegramId && (
                <Chip
                  icon={<TelegramIcon />}
                  color="success"
                  label={`${t.connect.linkedIdPrefix.value}: ${user.telegramId}`}
                  variant="outlined"
                />
              )}
            </Stack>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Stack
            spacing={2}
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t.quickSend.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t.quickSend.subtitle}
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Send />}
                onClick={() => sendReport('daily')}
                disabled={sendingDaily || !chatId}
              >
                {t.quickSend.sendToday}
              </Button>
              <Button
                variant="outlined"
                startIcon={<AccessTime />}
                onClick={() => sendReport('monthly')}
                disabled={sendingMonthly || !chatId}
              >
                {t.quickSend.sendMonth}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t.history.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t.history.subtitle}
              </Typography>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t.history.table.type}</TableCell>
                    <TableCell>{t.history.table.reportDate}</TableCell>
                    <TableCell>{t.history.table.chat}</TableCell>
                    <TableCell>{t.history.table.status}</TableCell>
                    <TableCell>{t.history.table.sentAt}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.length === 0 && !loadingReports && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography variant="body2" color="text.secondary">
                          {t.history.empty}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {reports.map(report => (
                    <TableRow key={report.id} hover>
                      <TableCell>{reportTypeLabel(report.reportType, t)}</TableCell>
                      <TableCell>{formatDate(report.reportDate, locale, t)}</TableCell>
                      <TableCell>{report.chatId}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={getStatusColor(report.status)}
                          label={statusLabel(report.status, t)}
                        />
                      </TableCell>
                      <TableCell>
                        {formatDate(report.sentAt || report.createdAt, locale, t)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </Paper>

        <Divider />
        <Paper elevation={0} sx={{ p: 3, border: '1px dashed', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            {t.howTo.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t.howTo.text}
          </Typography>
        </Paper>
      </Stack>
    </Container>
  );
}

function formatDate(dateString: string | null | undefined, locale: string, t: any) {
  if (!dateString) return t.history.dash.value;
  const date = new Date(dateString);
  return date.toLocaleString(locale);
}

function getStatusColor(status: ReportStatus) {
  switch (status) {
    case 'sent':
      return 'success';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

function reportTypeLabel(type: ReportType, t: any) {
  switch (type) {
    case 'daily':
      return t.reportType.daily.value;
    case 'monthly':
      return t.reportType.monthly.value;
    default:
      return t.reportType.custom.value;
  }
}

function statusLabel(status: ReportStatus, t: any) {
  switch (status) {
    case 'sent':
      return t.reportStatus.sent.value;
    case 'failed':
      return t.reportStatus.failed.value;
    default:
      return t.reportStatus.pending.value;
  }
}
