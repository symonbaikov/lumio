'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { tokens } from '@/lib/theme-tokens';

/**
 * Workbook import has no connection to configure: the import itself is a
 * multi-step wizard with wide column previews, which stays on its own page.
 * The panel is the entry point into it.
 */
export function WorkbookImportPanel({ onNavigate }: { onNavigate: () => void }): React.JSX.Element {
  const router = useRouter();

  const go = (path: string): void => {
    onNavigate();
    router.push(path);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: tokens.radius.md,
        bgcolor: 'background.paper',
      }}
    >
      <Typography sx={{ fontSize: 14, lineHeight: 1.6, color: 'text.secondary' }}>
        Import rows from an XLSX, CSV or ODS workbook, or from a shared Google Sheets link. No OAuth
        connection is needed — pick the source and map the columns in the import wizard.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={() => go('/custom-tables/import/google-sheets')}>
          Open import wizard
        </Button>
        <Button variant="outlined" onClick={() => go('/custom-tables')}>
          Open tables
        </Button>
      </Box>
    </Box>
  );
}
