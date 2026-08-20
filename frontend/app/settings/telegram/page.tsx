/* eslint-disable max-lines */
'use client';

import { CheckCircle, Clock, Send, Bot as TelegramIcon } from '@/app/components/icons';
import { useAuth } from '@/app/hooks/useAuth';
import { usePermissions } from '@/app/hooks/usePermissions';
import { useIntlayer, useLocale } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { getApiErrorMessage } from '@/app/lib/api-error';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Skeleton,
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
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';

function TelegramSettingsSkeleton(): React.JSX.Element {
  return (
    <Container maxWidth={false} className="container-shared" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Skeleton variant="text" width={220} height={40} />
          <Skeleton variant="text" width={320} height={24} />
        </Box>

        {['bot', 'connect', 'quickSend'].map(key => (
          <Paper key={key} elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
            <Stack spacing={3}>
              <Box>
                <Skeleton variant="text" width={160} height={28} />
                <Skeleton variant="text" width="80%" height={20} />
              </Box>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <Skeleton variant="rounded" width="100%" height={56} />
                <Skeleton variant="rounded" width="100%" height={56} />
              </Stack>
              <Skeleton variant="rounded" width={140} height={36} />
            </Stack>
          </Paper>
        ))}

        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={2}>
            <Box>
              <Skeleton variant="text" width={160} height={28} />
              <Skeleton variant="text" width="60%" height={20} />
            </Box>
            {['row1', 'row2', 'row3'].map(key => (
              <Skeleton key={key} variant="rounded" width="100%" height={40} />
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

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

// eslint-disable-next-line max-lines-per-function, complexity, @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
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
  const [botToken, setBotToken] = useState('');
  const [botTimeoutMs, setBotTimeoutMs] = useState('10000');
  const [botConfigured, setBotConfigured] = useState(false);
  const [savingBot, setSavingBot] = useState(false);

  const formatTelegramDate = (dateString: string | null | undefined): string => {
    if (!dateString) return t.history.dash.value;
    const date = new Date(dateString);
    return date.toLocaleString(locale);
  };

  const getReportTypeLabel = (type: ReportType): string => {
    switch (type) {
      case 'daily':
        return t.reportType.daily.value;
      case 'monthly':
        return t.reportType.monthly.value;
      default:
        return t.reportType.custom.value;
    }
  };

  const getStatusLabel = (status: ReportStatus): string => {
    switch (status) {
      case 'sent':
        return t.reportStatus.sent.value;
      case 'failed':
        return t.reportStatus.failed.value;
      default:
        return t.reportStatus.pending.value;
    }
  };

  useEffect(() => {
    if (user) {
      setChatId(user.telegramChatId || '');
      setTelegramId(user.telegramId || '');
    }
  }, [user]);

  useEffect(() => {
    void loadReports();
    void loadBotSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadReports = async (): Promise<void> => {
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

  const loadBotSettings = async (): Promise<void> => {
    try {
      const response = await apiClient.get('/settings/notifications/telegram');
      const settings = response.data?.settings || {};
      setBotConfigured(Boolean(settings.botTokenConfigured || response.data?.connected));
      setBotTimeoutMs(String(settings.timeoutMs || 10000));
    } catch (err) {
      console.error('Failed to load telegram bot settings', err);
    }
  };

  const saveBotSettings = async (): Promise<void> => {
    try {
      setSavingBot(true);
      setStatusMessage(null);
      setError(null);
      await apiClient.put('/settings/notifications/telegram', {
        botToken,
        timeoutMs: Number(botTimeoutMs) || 10000,
      });
      setBotToken('');
      setBotConfigured(true);
      setStatusMessage('Telegram bot settings saved.');
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to save Telegram bot settings');
      setError(message);
    } finally {
      setSavingBot(false);
    }
  };

  const connectTelegram = async (): Promise<void> => {
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
    } catch (err) {
      const message = getApiErrorMessage(err, t.errors.connectFailed.value);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const sendReport = async (type: ReportType): Promise<void> => {
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
    } catch (err) {
      const message = getApiErrorMessage(err, t.errors.sendFailed.value);
      setError(message);
    } finally {
      setSending(false);
    }
  };

  const canView = useMemo(() => hasPermission('telegram.view'), [hasPermission]);

  if (authLoading) {
    return <TelegramSettingsSkeleton />;
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
                Bot token
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure the workspace Telegram bot token in the UI. The token is encrypted and is
                not returned after saving.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                type="password"
                label="Bot token"
                placeholder={
                  botConfigured ? 'Configured, leave blank to keep current token' : '123456:ABC'
                }
                value={botToken}
                onChange={e => setBotToken(e.target.value)}
              />
              <TextField
                fullWidth
                label="Timeout, ms"
                value={botTimeoutMs}
                onChange={e => setBotTimeoutMs(e.target.value)}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                startIcon={<CheckCircle size={18} />}
                onClick={saveBotSettings}
                disabled={savingBot || (!botConfigured && !botToken)}
              >
                {savingBot ? 'Checking...' : botConfigured ? 'Update bot' : 'Save bot'}
              </Button>
              {botConfigured && (
                <Chip
                  icon={<TelegramIcon size={16} />}
                  color="success"
                  label="Bot configured"
                  variant="outlined"
                />
              )}
            </Stack>
          </Stack>
        </Paper>

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
                startIcon={<CheckCircle size={18} />}
                onClick={connectTelegram}
                disabled={loading}
              >
                {t.connect.save}
              </Button>
              {user?.telegramId && (
                <Chip
                  icon={<TelegramIcon size={16} />}
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
                startIcon={<Clock size={18} />}
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
                      <TableCell>{getReportTypeLabel(report.reportType)}</TableCell>
                      <TableCell>{formatTelegramDate(report.reportDate)}</TableCell>
                      <TableCell>{report.chatId}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={getStatusColor(report.status)}
                          label={getStatusLabel(report.status)}
                        />
                      </TableCell>
                      <TableCell>{formatTelegramDate(report.sentAt || report.createdAt)}</TableCell>
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

function getStatusColor(status: ReportStatus): 'success' | 'error' | 'default' {
  switch (status) {
    case 'sent':
      return 'success';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}
