'use client';

import { MoreHorizontal, Tag } from '@/app/components/icons';
import { resolveCategoryIconUrl } from '@/app/lib/category-icon-url';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

interface CategoryIconBadgeProps {
  color: string;
  icon: string | null;
  /** Shows a "more" glyph instead of the generic fallback tag. */
  isOther?: boolean;
  size?: number;
}

export function CategoryIconBadge({ color, icon, isOther, size = 26 }: CategoryIconBadgeProps) {
  const iconUrl = isOther ? null : resolveCategoryIconUrl(icon);
  const glyphSize = Math.round(size * 0.54);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        bgcolor: alpha(color, 0.16),
        color,
      }}
    >
      {iconUrl ? (
        <Box
          component="img"
          src={iconUrl}
          alt=""
          sx={{ width: glyphSize, height: glyphSize, objectFit: 'contain' }}
        />
      ) : isOther ? (
        <MoreHorizontal size={glyphSize} />
      ) : (
        <Tag size={glyphSize} />
      )}
    </Box>
  );
}
