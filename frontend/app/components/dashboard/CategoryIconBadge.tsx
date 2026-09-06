'use client';

import { resolveCategoryVisual } from '@/app/lib/category-defaults';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import type React from 'react';

interface CategoryIconBadgeProps {
  /** Category name; drives the default icon and colour for system categories. */
  name?: string | null;
  color?: string | null;
  icon?: string | null;
  /** Shows a "more" glyph instead of the generic fallback tag. */
  isOther?: boolean;
  size?: number;
}

export function CategoryIconBadge({
  name,
  color,
  icon,
  isOther,
  size = 26,
}: CategoryIconBadgeProps): React.JSX.Element {
  const visual = resolveCategoryVisual({ name, color, icon, isOther });
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
        bgcolor: alpha(visual.color, 0.16),
        color: visual.color,
      }}
    >
      {visual.iconUrl ? (
        <Box
          component="img"
          src={visual.iconUrl}
          alt=""
          sx={{ width: glyphSize, height: glyphSize, objectFit: 'contain' }}
        />
      ) : (
        <visual.Icon size={glyphSize} />
      )}
    </Box>
  );
}
