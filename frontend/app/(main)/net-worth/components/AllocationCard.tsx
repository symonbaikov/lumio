'use client';

import { formatMoney } from '@/app/lib/format-money';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { NetWorthBreakdownItem } from '../hooks/useNetWorth';

/**
 * Slot order matters: adjacent slots are the ones that end up side by side in
 * the bar, so they are ordered to stay distinguishable as neighbours.
 */
const SERIES_COLORS = [
  tokens.color.catTransport,
  tokens.color.catFood,
  tokens.color.catIncome,
  tokens.color.catHousing,
  tokens.color.catShopping,
  tokens.color.catOther,
];

interface AllocationCardProps {
  title: string;
  items: NetWorthBreakdownItem[];
  currency: string;
  locale: string;
}

export function AllocationCard({ title, items, currency, locale }: AllocationCardProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: tokens.radius.md,
        bgcolor: 'background.paper',
        p: 3,
      }}
    >
      <Typography
        variant="overline"
        sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.6 }}
      >
        {title}
      </Typography>

      <Box sx={{ display: 'flex', gap: '2px', height: 10, mt: 1.5, mb: 2 }}>
        {items.map((item, index) => (
          <Box
            key={item.code}
            title={`${item.name} ${item.percent}%`}
            sx={{
              flexGrow: Math.max(item.percent, 0.5),
              bgcolor: SERIES_COLORS[index % SERIES_COLORS.length],
              borderRadius: tokens.radius.full,
            }}
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {items.map((item, index) => (
          <Box key={item.code} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                flexShrink: 0,
                bgcolor: SERIES_COLORS[index % SERIES_COLORS.length],
              }}
            />
            <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>
              {item.name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', flexShrink: 0 }}>
              {item.percent}%
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, flexShrink: 0, minWidth: 100, textAlign: 'right' }}
            >
              {formatMoney(item.amount, currency, locale)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
