'use client';

import apiClient from '@/app/lib/api';
import { tokens } from '@/lib/theme-tokens';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { Box, Stack, Typography } from '@mui/material';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import type React from 'react';
import { useEffect, useState } from 'react';

type LocalCategorizationStatus = {
  connected: boolean;
  settings?: {
    enabled?: boolean;
    modelId?: string;
    threshold?: number;
    localModelPath?: string | null;
    modelInstalled?: boolean;
  };
};

type LocalCategorizationTestResult = {
  ready: boolean;
  merchantName: string;
  category: string | null;
  modelLoadError: string | null;
};

const DEFAULT_MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
// Starter values for an editable field, not UI copy: the user replaces them
// and the embedding model is multilingual, so they are plain defaults.
const DEFAULT_CATEGORIES = ['Groceries', 'Transport', 'Entertainment', 'Health', 'Utilities'];

export default function LocalCategorizationPage(): React.JSX.Element {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;
  const [status, setStatus] = useState<LocalCategorizationStatus | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [threshold, setThreshold] = useState(0.35);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES.join('\n'));
  const [merchantName, setMerchantName] = useState('Fresh Market');
  const [testResult, setTestResult] = useState<LocalCategorizationTestResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let mounted = true;

    apiClient
      .get<LocalCategorizationStatus>('/settings/local-categorization')
      .then(response => {
        if (!mounted) {
          return;
        }
        applyStatus(response.data);
      })
      .catch(() => {
        if (mounted) {
          setMessage('Unable to load local categorization settings.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const applyStatus = (next: LocalCategorizationStatus): void => {
    setStatus(next);
    setEnabled(next.settings?.enabled ?? true);
    setModelId(next.settings?.modelId || DEFAULT_MODEL_ID);
    setThreshold(Number(next.settings?.threshold ?? 0.35));
  };

  const saveSettings = async (): Promise<void> => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await apiClient.put<LocalCategorizationStatus>(
        '/settings/local-categorization',
        {
          enabled,
          modelId,
          threshold,
        },
      );
      applyStatus(response.data);
      setMessage('Settings saved.');
    } catch {
      setMessage('Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const uploadModel = async (file: File | undefined): Promise<void> => {
    if (!file) {
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('model', file);
      const response = await apiClient.post<LocalCategorizationStatus>(
        '/settings/local-categorization/model',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      applyStatus(response.data);
      setMessage('Model installed.');
    } catch {
      setMessage('Unable to install model archive.');
    } finally {
      setUploading(false);
    }
  };

  const testMerchant = async (): Promise<void> => {
    setTesting(true);
    setMessage(null);
    try {
      const response = await apiClient.post<LocalCategorizationTestResult>(
        '/settings/local-categorization/test',
        {
          merchantName,
          categories: splitCategories(categories),
        },
      );
      setTestResult(response.data);
    } catch {
      setMessage('Unable to test local categorization.');
    } finally {
      setTesting(false);
    }
  };

  const modelInstalled = Boolean(status?.settings?.modelInstalled);
  const statusLabel = modelInstalled ? 'Model ready' : 'Model missing';

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Link
          href="/integrations"
          style={{ color: c.ink600, fontSize: 14, textDecoration: 'none' }}
        >
          Back to integrations
        </Link>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: tokens.radius.md,
              bgcolor: modelInstalled ? c.successSoft : c.ink100,
              color: modelInstalled ? c.success : c.ink600,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            {modelInstalled ? (
              <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />
            ) : (
              <CategoryOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />
            )}
          </Box>
          <Stack spacing={0.75}>
            <Typography component="h1" sx={{ color: c.ink900, fontSize: 28, fontWeight: 700 }}>
              Local categorization
            </Typography>
            <Typography sx={{ color: c.ink600, fontSize: 15, lineHeight: 1.6 }}>
              Install a Transformers.js model archive and test private merchant categorization on
              this machine.
            </Typography>
          </Stack>
        </Box>

        <Panel>
          <Stack spacing={2}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}
            >
              <Typography sx={{ color: c.ink900, fontSize: 18, fontWeight: 650 }}>
                Status
              </Typography>
              <Typography
                sx={{
                  color: modelInstalled ? c.success : c.ink600,
                  fontSize: 13,
                  fontWeight: 650,
                  textTransform: 'uppercase',
                }}
              >
                {statusLabel}
              </Typography>
            </Box>
            <Typography sx={{ color: c.ink600, fontSize: 14, lineHeight: 1.6 }}>
              Categorization runs locally. The model archive is stored by the backend and remote
              model loading stays disabled during tests.
            </Typography>
            {status?.settings?.localModelPath ? (
              <Typography sx={{ color: c.ink500, fontSize: 12 }}>
                Installed path: {status.settings.localModelPath}
              </Typography>
            ) : null}
          </Stack>
        </Panel>

        <Panel>
          <Stack spacing={2}>
            <SectionHeader title="Settings">
              <button
                type="button"
                onClick={() => void saveSettings()}
                disabled={saving}
                style={buttonStyle(c.primary, c.surface)}
              >
                {saving ? 'Saving...' : 'Save settings'}
              </button>
            </SectionHeader>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 160px' },
                gap: 1.5,
              }}
            >
              <label style={{ display: 'grid', gap: 6 }}>
                <Typography sx={labelSx(c)}>Model</Typography>
                <input
                  name="modelId"
                  value={modelId}
                  onChange={event => setModelId(event.target.value)}
                  style={inputStyle(c)}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <Typography sx={labelSx(c)}>Threshold</Typography>
                <input
                  name="threshold"
                  type="number"
                  min="0.01"
                  max="1"
                  step="0.01"
                  value={threshold}
                  onChange={event => setThreshold(Number(event.target.value))}
                  style={inputStyle(c)}
                />
              </label>
            </Box>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={event => setEnabled(event.target.checked)}
              />
              <Typography sx={{ color: c.ink700, fontSize: 14 }}>
                Enable local categorization
              </Typography>
            </label>
          </Stack>
        </Panel>

        <Panel>
          <Stack spacing={2}>
            <SectionHeader title="Model archive">
              <label style={buttonStyle(c.primary, c.surface)}>
                <UploadFileOutlinedIcon sx={{ fontSize: 16, mr: 0.75 }} aria-hidden="true" />
                {uploading ? 'Installing...' : 'Upload ZIP'}
                <input
                  type="file"
                  accept=".zip,application/zip"
                  disabled={uploading}
                  onChange={event => void uploadModel(event.target.files?.[0])}
                  style={{ display: 'none' }}
                />
              </label>
            </SectionHeader>
            <Typography sx={{ color: c.ink600, fontSize: 14, lineHeight: 1.6 }}>
              Upload a ZIP that contains a Transformers.js model with config.json and an onnx model
              file. The app will install it into the workspace model folder.
            </Typography>
          </Stack>
        </Panel>

        <Panel>
          <Stack spacing={2}>
            <SectionHeader title="Test merchant">
              <button
                type="button"
                onClick={() => void testMerchant()}
                disabled={testing}
                style={buttonStyle(c.primary, c.surface)}
              >
                {testing ? 'Testing...' : 'Test merchant'}
              </button>
            </SectionHeader>

            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}
            >
              <label style={{ display: 'grid', gap: 6 }}>
                <Typography sx={labelSx(c)}>Merchant name</Typography>
                <input
                  name="merchantName"
                  value={merchantName}
                  onChange={event => setMerchantName(event.target.value)}
                  style={inputStyle(c)}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <Typography sx={labelSx(c)}>Categories</Typography>
                <textarea
                  value={categories}
                  onChange={event => setCategories(event.target.value)}
                  rows={5}
                  style={{ ...inputStyle(c), resize: 'vertical' }}
                />
              </label>
            </Box>

            {testResult ? (
              <Box
                sx={{
                  border: `1px solid ${c.ink150}`,
                  borderRadius: tokens.radius.sm,
                  px: 1.5,
                  py: 1,
                  color: c.ink800,
                  fontSize: 14,
                }}
              >
                Result: {testResult.category ?? 'Not determined'}
                {testResult.modelLoadError ? ` (${testResult.modelLoadError})` : ''}
              </Box>
            ) : null}

            {message ? (
              <Typography sx={{ color: c.ink600, fontSize: 14 }}>{message}</Typography>
            ) : null}
          </Stack>
        </Panel>
      </Stack>
    </Box>
  );
}

function Panel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Box
      sx={{
        border: '1px solid var(--color-border)',
        borderRadius: tokens.radius.md,
        bgcolor: 'background.paper',
        p: 3,
      }}
    >
      {children}
    </Box>
  );
}

function SectionHeader({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Typography sx={{ fontSize: 18, fontWeight: 650 }}>{title}</Typography>
      {children}
    </Box>
  );
}

function splitCategories(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map(item => item.trim())
    .filter(Boolean);
}

function labelSx(c: { ink700: string }) {
  return { color: c.ink700, fontSize: 13, fontWeight: 600 };
}

function buttonStyle(color: string, background: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
    border: `1px solid ${color}`,
    borderRadius: tokens.radius.md,
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 650,
    color,
    background,
    cursor: 'pointer',
  };
}

function inputStyle(c: { ink150: string; ink900: string; surface: string }): React.CSSProperties {
  return {
    width: '100%',
    minHeight: 38,
    border: `1px solid ${c.ink150}`,
    borderRadius: tokens.radius.sm,
    padding: '8px 10px',
    fontSize: 14,
    color: c.ink900,
    background: c.surface,
  };
}
