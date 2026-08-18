'use client';

import { Lightbulb } from '@/app/components/icons';
import { Spinner } from '@/app/components/ui/spinner';
import { useInsights } from '@/app/hooks/useInsights';
import { useIntlayer } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function AdvicePage() {
  const t = useIntlayer('insights');
  // The one place that recomputes: opening this page is the user asking for a
  // fresh read, unlike a banner that happens to render on every route.
  const { items, loading } = useInsights({ severities: ['info'], refreshFirst: true });

  return (
    <Box component="main" sx={{ p: 3, maxWidth: 800, mx: 'auto', width: '100%' }}>
      <Typography variant="h5" fontWeight={700}>
        {t.adviceTitle}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {t.adviceSubtitle}
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Spinner size={32} />
        </Box>
      )}

      {!loading && items.length === 0 && (
        <Typography sx={{ color: 'text.secondary', py: 6, textAlign: 'center' }}>
          {t.adviceEmpty}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(item => (
          <Box
            key={item.id}
            sx={{
              display: 'flex',
              gap: 2,
              p: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: tokens.radius.md,
              bgcolor: 'background.paper',
            }}
          >
            <Lightbulb size={20} color={tokens.color.info} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body1" fontWeight={600}>
                {item.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {item.message}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
