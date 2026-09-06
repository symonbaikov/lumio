'use client';

import { Lightbulb } from '@/app/components/icons';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { useInsights } from '@/app/hooks/useInsights';
import { useIntlayer } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

const ADVICE_SKELETON_KEYS = ['advice-0', 'advice-1', 'advice-2', 'advice-3'];

function AdviceCardSkeleton(): React.JSX.Element {
  return (
    <Box
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
      <Skeleton variant="rounded" width={20} height={20} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Skeleton variant="text" width="40%" height={22} />
        <Skeleton variant="text" width="85%" height={18} />
      </Box>
    </Box>
  );
}

export default function AdvicePage() {
  const t = useIntlayer('insights');
  // The one place that recomputes: opening this page is the user asking for a
  // fresh read, unlike a banner that happens to render on every route.
  const { items, loading } = useInsights({ severities: ['info'], refreshFirst: true });

  return (
    <Box component="main" sx={{ px: { xs: 2, md: 4 }, py: 3, width: '100%' }}>
      <Typography variant="h5" fontWeight={700}>
        {t.adviceTitle}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {t.adviceSubtitle}
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ADVICE_SKELETON_KEYS.map(key => (
            <AdviceCardSkeleton key={key} />
          ))}
        </Box>
      )}

      {!loading && items.length === 0 && (
        <EmptyState illustration="notifications" description={t.adviceEmpty} />
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
