'use client';

import { AlertTriangle, X } from '@/app/components/icons';
import { useInsights } from '@/app/hooks/useInsights';
import { useIntlayer } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

/**
 * Urgent insights, shown above the page content wherever the user happens to
 * be. Advisory ones are deliberately not here — they live on the Advice page,
 * so a banner appearing always means something actually needs attention.
 */
export function AlertBanner() {
  const t = useIntlayer('insights');
  const { items, dismiss } = useInsights({ severities: ['warn', 'critical'] });

  if (items.length === 0) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: 3, pt: 2 }}>
      {items.map(item => (
        <Box
          key={item.id}
          role="status"
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
            px: 2,
            py: 1.5,
            border: '1px solid',
            borderColor: item.severity === 'critical' ? 'error.main' : 'warning.main',
            borderRadius: tokens.radius.sm,
            bgcolor: item.severity === 'critical' ? 'error.light' : 'warning.light',
          }}
        >
          <AlertTriangle
            size={18}
            color={item.severity === 'critical' ? tokens.color.danger : tokens.color.warning}
          />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600}>
              {item.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {item.message}
            </Typography>
          </Box>
          <IconButton
            size="small"
            aria-label={t.dismiss.value}
            onClick={() => void dismiss(item.id)}
          >
            <X size={16} />
          </IconButton>
        </Box>
      ))}
    </Box>
  );
}
