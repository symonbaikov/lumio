'use client';

import { Cloud, Download, Folder } from '@/app/components/icons';
import { Alert } from '@/app/components/ui/alert';
import { Spinner } from '@/app/components/ui/spinner';
import { BackupSection } from '@/app/settings/profile/components/BackupSection';
import type { BankStat } from '@/app/settings/profile/hooks/useSync';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from 'next-themes';

const BANK_LABELS: Record<string, string> = {
  bereke_new: 'Bereke Bank (new)',
  bereke_old: 'Bereke Bank (old)',
  kaspi: 'Kaspi Bank',
  hapoalim: 'Bank Hapoalim',
  other: 'Other',
};

type Props = {
  bankStats: BankStat[];
  totalCount: number;
  statsLoading: boolean;
  downloading: boolean;
  errorMessage: string | null;
  handleExportZip: () => void;
};

export function SyncSection({
  bankStats,
  totalCount,
  statsLoading,
  downloading,
  errorMessage,
  handleExportZip,
}: Props) {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? tokens.dark.color : tokens.color;

  return (
    <Stack spacing={2.5}>
      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}

      {/* Description */}
      <Card variant="outlined">
        <Box sx={{ px: 2, pt: 2, pb: 0 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Export to filesystem
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Download all your files as a ZIP archive organized by bank and file type. Unpack it
            locally to sync with your filesystem.
          </Typography>
        </Box>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Cloud size={18} style={{ color: c.ink400 }} />
            <Typography variant="body2" color="text.secondary">
              Files will be organized into folders:
            </Typography>
          </Box>

          {/* Folder structure preview */}
          <Box
            sx={{
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
              px: 2,
              py: 1.5,
              fontFamily: 'monospace',
              fontSize: 13,
              color: 'text.secondary',
              mb: 2.5,
            }}
          >
            {statsLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Spinner size={14} />
                <span>Loading structure…</span>
              </Box>
            ) : (
              <Stack spacing={0.25}>
                <span>lumio-export.zip</span>
                {bankStats.map(({ bank, count }) => (
                  <Box key={bank} sx={{ pl: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Folder size={13} />
                      <span>{bank}/</span>
                      <Chip label={count} size="small" sx={{ height: 16, fontSize: 11 }} />
                    </Box>
                  </Box>
                ))}
                {bankStats.length === 0 && (
                  <Box sx={{ pl: 2, color: 'text.disabled' }}>
                    <span>(no files yet)</span>
                  </Box>
                )}
              </Stack>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleExportZip}
              disabled={downloading || totalCount === 0}
              startIcon={downloading ? <Spinner size={16} /> : <Download size={16} />}
            >
              {downloading
                ? 'Exporting…'
                : `Export ZIP${totalCount > 0 ? ` (${totalCount} files)` : ''}`}
            </Button>
            {totalCount === 0 && !statsLoading && (
              <Typography variant="body2" color="text.disabled">
                No files to export
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
      <BackupSection />
    </Stack>
  );
}
