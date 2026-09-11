'use client';

import Box from '@mui/material/Box';
import Image from 'next/image';
import { memo } from 'react';
import { Check } from '@/app/components/icons';
import { tokens } from '@/lib/theme-tokens';

interface BackgroundSelectorProps {
  selectedBackground: string | null;
  onSelect: (background: string) => void;
  backgrounds: string[];
  compact?: boolean;
}

interface BackgroundCardProps {
  background: string;
  selected: boolean;
  compact: boolean;
  onSelect: (background: string) => void;
}

const BackgroundCard = memo(function BackgroundCard({
  background,
  selected,
  compact,
  onSelect,
}: BackgroundCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(background)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        border: selected ? '2px solid var(--primary)' : '2px solid var(--border-color)',
        borderRadius: tokens.radius.md,
        aspectRatio: compact ? '2.35/1' : '16/9',
        cursor: 'pointer',
        padding: 0,
        background: 'none',
      }}
    >
      <Image
        src={`/workspace-backgrounds/${background}`}
        alt={background}
        fill
        sizes={
          compact
            ? '(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 180px'
            : '(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 220px'
        }
        quality={50}
        loading="lazy"
        style={{ objectFit: 'cover' }}
      />
      {selected ? (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.45)',
          }}
        >
          <Box
            sx={{
              borderRadius: tokens.radius.full,
              bgcolor: 'background.paper',
              p: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={20} style={{ color: 'var(--primary)' }} />
          </Box>
        </Box>
      ) : null}
    </button>
  );
});

export const BackgroundSelector = memo(function BackgroundSelector({
  selectedBackground,
  onSelect,
  backgrounds,
  compact = false,
}: BackgroundSelectorProps) {
  const minColumnWidth = compact ? 150 : 220;

  return (
    <Box
      sx={{ display: 'grid', gap: compact ? 1 : 1.5 }}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minColumnWidth}px, 1fr))` }}
    >
      {backgrounds.map(background => (
        <BackgroundCard
          key={background}
          background={background}
          selected={selectedBackground === background}
          compact={compact}
          onSelect={onSelect}
        />
      ))}
    </Box>
  );
});

BackgroundSelector.displayName = 'BackgroundSelector';
