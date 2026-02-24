'use client';

import { Check } from 'lucide-react';
import Image from 'next/image';
import React, { memo } from 'react';

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
      className={`relative overflow-hidden rounded-lg border-2 transition-all hover:scale-[1.01] ${
        compact ? 'aspect-[2.35/1]' : 'aspect-video'
      } ${
        selected
          ? 'border-primary ring-2 ring-primary/20 dark:ring-primary/30'
          : 'border-gray-300 hover:border-primary/60 dark:border-gray-600'
      }`}
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
        className="object-cover"
      />
      {selected ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45">
          <div className="rounded-full bg-white p-1 dark:bg-gray-800">
            <Check className="h-5 w-5 text-primary" />
          </div>
        </div>
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
    <div
      className={`grid ${compact ? 'gap-2' : 'gap-3'}`}
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
    </div>
  );
});

BackgroundSelector.displayName = 'BackgroundSelector';
