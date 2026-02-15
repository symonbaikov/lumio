'use client';

import { Check } from 'lucide-react';
import React from 'react';

interface BackgroundSelectorProps {
  selectedBackground: string | null;
  onSelect: (background: string) => void;
  backgrounds: string[];
}

export function BackgroundSelector({
  selectedBackground,
  onSelect,
  backgrounds,
}: BackgroundSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {backgrounds.map(background => (
        <button
          key={background}
          type="button"
          onClick={() => onSelect(background)}
          className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
            selectedBackground === background
              ? 'border-primary ring-2 ring-primary/20 dark:ring-primary/30'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary/60'
          }`}
        >
          <img
            src={`/workspace-backgrounds/${background}`}
            alt={background}
            className="w-full h-full object-cover"
          />
          {selectedBackground === background && (
            <div className="absolute inset-0 bg-primary bg-opacity-30 flex items-center justify-center">
              <div className="bg-white dark:bg-gray-800 rounded-full p-1">
                <Check className="w-5 h-5 text-primary" />
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
