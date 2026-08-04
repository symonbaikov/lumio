'use client';

import { Cloud, Download, FileUp, Lock, RefreshCw } from '@/app/components/icons';
import { Alert } from '@/app/components/ui/alert';
import { Spinner } from '@/app/components/ui/spinner';
import apiClient from '@/app/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useRef, useState } from 'react';

type BackupConfig = {
  destinationKind: 'local' | 'nextcloud';
  destinationPath: string;
  dailyTime: string;
  timeZone: string;
  retentionCount: number;
  enabled: boolean;
  lastSuccessfulAt: string | null;
  passwordConfigured: boolean;
};

type BackupRun = {
  id: string;
  status: 'running' | 'succeeded' | 'failed';
  trigger: 'manual' | 'scheduled';
  createdAt: string;
  finishedAt: string | null;
  sizeBytes: string | null;
  errorMessage: string | null;
};

const defaultConfig: BackupConfig = {
  destinationKind: 'local',
  destinationPath: 'lumio-backups',
  dailyTime: '03:00',
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  retentionCount: 7,
  enabled: true,
  lastSuccessfulAt: null,
  passwordConfigured: false,
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This settings panel owns its related async form actions.
export function BackupSection() {
  const [config, setConfig] = useState<BackupConfig>(defaultConfig);
  const [runs, setRuns] = useState<BackupRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [password, setPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    importId: string;
    workspaceName: string;
    fileCount: number;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [configResponse, runsResponse] = await Promise.all([
        apiClient.get<BackupConfig | null>('/backups/config'),
        apiClient.get<BackupRun[]>('/backups/runs'),
      ]);
      if (configResponse.data) {
        setConfig(configResponse.data);
      }
      setRuns(runsResponse.data ?? []);
      setError(null);
    } catch {
      setError('Could not load backup settings. Only workspace owners can manage backups.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = async () => {
    if (!(config.passwordConfigured || password)) {
      setError(
        'Set a recovery password before enabling backups. It is required to restore a backup.',
      );
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await apiClient.put<BackupConfig>('/backups/config', {
        ...config,
        password: password || undefined,
      });
      setConfig(response.data);
      setPassword('');
      setMessage('Backup settings saved.');
    } catch {
      setError('Could not save backup settings. Check the destination and try again.');
    } finally {
      setSaving(false);
    }
  };

  const createNow = async () => {
    setRunning(true);
    setMessage(null);
    setError(null);
    try {
      await apiClient.post('/backups/runs');
      setMessage('Backup created successfully.');
      await refresh();
    } catch {
      setError('Backup failed. Your last successful backup was kept unchanged.');
      await refresh();
    } finally {
      setRunning(false);
    }
  };

  const download = async (run: BackupRun) => {
    try {
      const response = await apiClient.get(`/backups/runs/${run.id}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lumio-${run.id}.lumio-backup`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not download this backup.');
    }
  };

  const importBackup = async (restore: boolean) => {
    if (!(importFile && importPassword)) {
      setError('Choose a .lumio-backup file and enter its recovery password.');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', importFile);
      body.append('password', importPassword);
      const response = await apiClient.post<{
        importId: string;
        workspaceName: string;
        fileCount: number;
      }>(
        restore ? `/backups/imports/${preview?.importId}/restore` : '/backups/import/preview',
        body,
      );
      if (restore) {
        setMessage(`Restored “${response.data.workspaceName}” into a new workspace.`);
        setPreview(null);
        setImportFile(null);
        setImportPassword('');
      } else {
        setPreview(response.data);
      }
    } catch {
      setError('The backup could not be verified. Check the file and recovery password.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      {error ? <Alert variant="error">{error}</Alert> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 2,
                alignItems: 'flex-start',
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Backups
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 680 }}>
                  Encrypted snapshots include workspace data and original documents. Keep the
                  recovery password safe: Lumio cannot restore a backup without it.
                </Typography>
              </Box>
              <Button
                aria-label="Refresh backup status"
                onClick={() => void refresh()}
                disabled={loading}
                size="small"
                startIcon={<RefreshCw size={16} />}
              >
                Refresh
              </Button>
            </Box>

            {loading ? (
              <Spinner size={20} />
            ) : (
              <>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    select
                    fullWidth
                    label="Destination"
                    value={config.destinationKind}
                    onChange={event =>
                      setConfig(current => ({
                        ...current,
                        destinationKind: event.target.value as BackupConfig['destinationKind'],
                      }))
                    }
                  >
                    <MenuItem value="local">Server folder</MenuItem>
                    <MenuItem value="nextcloud">Nextcloud (WebDAV)</MenuItem>
                  </TextField>
                  <TextField
                    fullWidth
                    label="Backup folder"
                    value={config.destinationPath}
                    helperText="Letters, numbers, _ and - only"
                    onChange={event =>
                      setConfig(current => ({ ...current, destinationPath: event.target.value }))
                    }
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    fullWidth
                    type="time"
                    label="Daily time"
                    value={config.dailyTime}
                    InputLabelProps={{ shrink: true }}
                    onChange={event =>
                      setConfig(current => ({ ...current, dailyTime: event.target.value }))
                    }
                  />
                  <TextField
                    fullWidth
                    label="Time zone"
                    value={config.timeZone}
                    onChange={event =>
                      setConfig(current => ({ ...current, timeZone: event.target.value }))
                    }
                  />
                  <TextField
                    fullWidth
                    type="number"
                    inputProps={{ min: 1, max: 365 }}
                    label="Versions to keep"
                    value={config.retentionCount}
                    onChange={event =>
                      setConfig(current => ({
                        ...current,
                        retentionCount: Number(event.target.value) || 1,
                      }))
                    }
                  />
                </Stack>
                <TextField
                  fullWidth
                  type="password"
                  label={
                    config.passwordConfigured
                      ? 'New recovery password (optional)'
                      : 'Recovery password'
                  }
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  helperText={
                    config.passwordConfigured
                      ? 'Leave empty to keep the current password.'
                      : 'Required once; it is never stored in plain text.'
                  }
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    onClick={() => void save()}
                    disabled={saving}
                    startIcon={saving ? <Spinner size={16} /> : <Lock size={16} />}
                  >
                    Save backup settings
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => void createNow()}
                    disabled={running || !config.passwordConfigured}
                    startIcon={running ? <Spinner size={16} /> : <Cloud size={16} />}
                  >
                    Create now
                  </Button>
                  {config.lastSuccessfulAt ? (
                    <Typography variant="body2" color="text.secondary">
                      Last successful: {new Date(config.lastSuccessfulAt).toLocaleString()}
                    </Typography>
                  ) : null}
                </Box>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600}>
            Recent backups
          </Typography>
          <Stack spacing={1} sx={{ mt: 1.5 }}>
            {runs.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No backups yet.
              </Typography>
            ) : (
              runs.map(run => (
                <Box
                  key={run.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    pb: 1,
                  }}
                >
                  <Box>
                    <Typography variant="body2">
                      {new Date(run.createdAt).toLocaleString()} · {run.trigger}
                    </Typography>
                    {run.errorMessage ? (
                      <Typography variant="caption" color="error">
                        {run.errorMessage}
                      </Typography>
                    ) : null}
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      label={run.status}
                      color={
                        run.status === 'succeeded'
                          ? 'success'
                          : run.status === 'failed'
                            ? 'error'
                            : 'default'
                      }
                    />
                    {run.status === 'succeeded' ? (
                      <Button
                        size="small"
                        onClick={() => void download(run)}
                        startIcon={<Download size={15} />}
                      >
                        Download
                      </Button>
                    ) : null}
                  </Stack>
                </Box>
              ))
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Import a backup
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Import always creates a separate workspace. Existing data is never replaced or
                merged.
              </Typography>
            </Box>
            <input
              ref={importInput}
              type="file"
              accept=".lumio-backup,application/octet-stream"
              hidden
              onChange={event => {
                setImportFile(event.target.files?.[0] ?? null);
                setPreview(null);
              }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="outlined"
                onClick={() => importInput.current?.click()}
                startIcon={<FileUp size={16} />}
              >
                {importFile?.name || 'Choose backup file'}
              </Button>
              <TextField
                fullWidth
                type="password"
                label="Recovery password"
                value={importPassword}
                onChange={event => setImportPassword(event.target.value)}
              />
            </Stack>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                onClick={() => void importBackup(false)}
                disabled={importing}
              >
                Preview import
              </Button>
              {preview ? (
                <Button
                  color="warning"
                  variant="contained"
                  onClick={() => void importBackup(true)}
                  disabled={importing}
                >
                  {importing ? 'Restoring…' : `Restore “${preview.workspaceName}” as new workspace`}
                </Button>
              ) : null}
            </Box>
            {preview ? (
              <Typography variant="body2" color="text.secondary">
                Verified: {preview.workspaceName}, {preview.fileCount} document(s). Confirming will
                create a new workspace.
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
