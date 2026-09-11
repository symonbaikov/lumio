'use client';

import Box from '@mui/material/Box';
import { RefreshCcw } from '@/app/components/icons';
import { tokens } from '@/lib/theme-tokens';

type DashboardErrorBannerProps = { error: string; onRefresh: () => void };

const REFRESH_BTN_STYLE: React.CSSProperties = {
  marginLeft: 'auto',
  padding: 4,
  borderRadius: tokens.radius.full,
  color: '#be123c',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
};

export function DashboardErrorBanner({
  error,
  onRefresh,
}: DashboardErrorBannerProps): React.JSX.Element {
  return (
    <Box sx={{ px: 8, pt: 6 }}>
      <Box sx={{ border: '1px solid #fecaca', bgcolor: 'var(--color-error-soft-bg)', p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 2,
            py: 1.5,
            fontSize: 14,
            color: '#be123c',
          }}
        >
          <span>{error}</span>
          <button type="button" onClick={onRefresh} style={REFRESH_BTN_STYLE}>
            <RefreshCcw style={{ width: 16, height: 16 }} />
          </button>
        </Box>
      </Box>
    </Box>
  );
}
