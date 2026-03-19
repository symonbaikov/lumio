'use client';

import { Checkbox } from '@/app/components/ui/checkbox';
import { useAuth } from '@/app/hooks/useAuth';
import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { CheckCircle, CloudUpload, Delete, Error as ErrorIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface GoogleSheet {
  id: string;
  sheetName: string;
  sheetId: string;
}

export default function UploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useIntlayer('uploadPage');
  const [googleSheetId, setGoogleSheetId] = useState('');
  const [googleSheets, setGoogleSheets] = useState<GoogleSheet[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    Record<string, 'uploading' | 'success' | 'error'>
  >({});

  // Load Google Sheets on mount
  useEffect(() => {
    if (user) {
      loadGoogleSheets();
    }
  }, [user]);

  const loadGoogleSheets = async () => {
    try {
      const response = await apiClient.get('/google-sheets');
      setGoogleSheets(response.data);
    } catch (err) {
      console.error('Failed to load Google Sheets:', err);
    }
  };

  const startGoogleOauth = async () => {
    try {
      setOauthLoading(true);
      const response = await apiClient.get('/google-sheets/oauth/url');
      const url = response.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        setError(t.oauthLinkMissing.value);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t.oauthStartFailed.value);
    } finally {
      setOauthLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'image/jpeg',
        'image/png',
      ];
      return validTypes.includes(file.type);
    });

    const totalFiles = files.length + validFiles.length;
    if (totalFiles > 2) {
      setError(t.maxTwoFiles.value);
      return;
    }

    setFiles(prev => [...prev, ...validFiles]);
    setError('');
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError(t.pickAtLeastOne.value);
      return;
    }

    setUploading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    // Only append googleSheetId if it's selected
    if (googleSheetId) {
      formData.append('googleSheetId', googleSheetId);
    }
    if (allowDuplicates) {
      formData.append('allowDuplicates', 'true');
    }

    try {
      const response = await apiClient.post('/statements/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(true);
      setFiles([]);
      setTimeout(() => {
        router.push('/statements');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t.uploadFailed.value);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          {t.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t.description}
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

        <Box sx={{ mb: 3 }} data-tour-id="google-sheets-section">
          <FormControl fullWidth>
            <InputLabel>{t.googleSheetOptional}</InputLabel>
            <Select
              value={googleSheetId}
              onChange={e => setGoogleSheetId(e.target.value)}
              label={t.googleSheetOptional.value}
            >
              <MenuItem value="">
                <em>{t.noSync}</em>
              </MenuItem>
              {googleSheets.map(sheet => (
                <MenuItem key={sheet.id} value={sheet.id}>
                  {sheet.sheetName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {t.googleSheetHelp}
          </Typography>
          {googleSheets.length === 0 && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {t.noConnectedSheets}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={startGoogleOauth}
                disabled={oauthLoading}
              >
                {oauthLoading ? t.oauthOpening : t.connectGoogleSheets}
              </Button>
            </Box>
          )}
        </Box>

        <Box
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          data-tour-id="drag-drop-zone"
          sx={{
            border: '2px dashed',
            borderColor: 'primary.main',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            mb: 3,
            cursor: 'pointer',
            '&:hover': {
              borderColor: 'primary.dark',
              backgroundColor: 'action.hover',
            },
          }}
        >
          <input
            type="file"
            id="file-upload"
            multiple
            accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <label htmlFor="file-upload">
            <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {t.dropTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t.dropSubtitle}
            </Typography>
          </label>
        </Box>

        <FormControlLabel
          data-tour-id="allow-duplicates"
          control={<Checkbox checked={allowDuplicates} onCheckedChange={setAllowDuplicates} />}
          label={t.allowDuplicates?.value ?? 'Allow uploading duplicates'}
          sx={{ mb: 1 }}
        />

        {files.length > 0 && (
          <Box sx={{ mb: 3 }} data-tour-id="file-list">
            <Typography variant="subtitle1" gutterBottom>
              {t.selectedFiles} ({files.length}/2):
            </Typography>
            <List>
              {files.map((file, index) => (
                <ListItem
                  key={`${file.name}-${file.lastModified}`}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => removeFile(index)} disabled={uploading}>
                      <Delete />
                    </IconButton>
                  }
                >
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={`${(file.size / 1024 / 1024).toFixed(2)} ${t.megabytesShort.value}`}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <Button
          variant="contained"
          fullWidth
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
          sx={{ mt: 2 }}
          data-tour-id="upload-button"
        >
          {uploading ? t.uploadButtonLoading : t.uploadButtonIdle}
        </Button>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            {t.afterUploadTitle}
          </Typography>
          <Typography variant="body2" component="div">
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li>{t.afterUploadSteps.step1}</li>
              <li>{t.afterUploadSteps.step2}</li>
              <li>{t.afterUploadSteps.step3}</li>
              <li>{t.afterUploadSteps.step4}</li>
              <li>{t.afterUploadSteps.step5}</li>
              <li>{t.afterUploadSteps.step6}</li>
            </ol>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
