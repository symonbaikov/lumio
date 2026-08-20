'use client';

import { Grid, List, Search, SortAsc } from '@/app/components/icons';
import { tokens } from '@/lib/theme-tokens';
import Box from '@mui/material/Box';
import React from 'react';

type ViewMode = 'grid' | 'list';
type SortOption = 'alphabetical' | 'recent' | 'favorites';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'favorites', label: 'Favorites First' },
  { key: 'alphabetical', label: 'Alphabetical' },
  { key: 'recent', label: 'Recently Created' },
];

const VIEW_MODES: { mode: ViewMode; Icon: typeof Grid; title: string }[] = [
  { mode: 'grid', Icon: Grid, title: 'Grid view' },
  { mode: 'list', Icon: List, title: 'List view' },
];

type SortMenuProps = {
  sortOption: SortOption;
  showSortMenu: boolean;
  onToggle: () => void;
  onSelect: (opt: SortOption) => void;
};
function SortMenu({
  sortOption,
  showSortMenu,
  onToggle,
  onSelect,
}: SortMenuProps): React.JSX.Element {
  return (
    <Box sx={{ position: 'relative' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          padding: 8,
          border: '1px solid var(--border-color)',
          background: showSortMenu ? 'rgba(var(--primary-rgb,22,129,24),0.1)' : 'var(--card-bg)',
          color: showSortMenu ? 'var(--primary)' : 'var(--text-secondary)',
          cursor: 'pointer',
          borderRadius: tokens.radius.md,
        }}
        title="Sort options"
      >
        <SortAsc size={20} />
      </button>
      {showSortMenu && (
        <Box
          sx={{
            position: 'absolute',
            right: 0,
            mt: 0.5,
            width: 192,
            bgcolor: 'background.paper',
            border: '1px solid var(--border-color)',
            borderRadius: tokens.radius.md,
            boxShadow: 3,
            zIndex: 10,
            overflow: 'hidden',
          }}
        >
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onSelect(opt.key)}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 16px',
                textAlign: 'left',
                fontSize: 14,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: sortOption === opt.key ? 600 : 400,
                color: sortOption === opt.key ? 'var(--primary)' : 'var(--foreground)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </Box>
      )}
    </Box>
  );
}

type ViewToggleProps = { viewMode: ViewMode; onSelect: (mode: ViewMode) => void };
function ViewToggle({ viewMode, onSelect }: ViewToggleProps): React.JSX.Element {
  return (
    <>
      {VIEW_MODES.map(({ mode, Icon, title }) => (
        <button
          key={mode}
          type="button"
          onClick={() => onSelect(mode)}
          style={{
            padding: 8,
            border: '1px solid var(--border-color)',
            background:
              viewMode === mode ? 'rgba(var(--primary-rgb,22,129,24),0.1)' : 'var(--card-bg)',
            color: viewMode === mode ? 'var(--primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            borderRadius: tokens.radius.md,
          }}
          title={title}
        >
          <Icon size={20} />
        </button>
      ))}
    </>
  );
}

type WorkspaceListFiltersProps = {
  searchQuery: string;
  searchPlaceholder: string;
  embedded: boolean;
  viewMode: ViewMode;
  sortOption: SortOption;
  showSortMenu: boolean;
  onSearchChange: (v: string) => void;
  onSortSelect: (opt: SortOption) => void;
  onSortMenuToggle: () => void;
  onViewModeSelect: (mode: ViewMode) => void;
};

export function WorkspaceListFilters({
  searchQuery,
  searchPlaceholder,
  embedded,
  viewMode,
  sortOption,
  showSortMenu,
  onSearchChange,
  onSortSelect,
  onSortMenuToggle,
  onViewModeSelect,
}: WorkspaceListFiltersProps): React.JSX.Element {
  return (
    <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ position: 'relative', flex: 1 }} data-tour-id="search-bar">
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted-foreground)',
          }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          style={{
            width: '100%',
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
            padding: '12px 16px 12px 44px',
            fontSize: 14,
            color: 'var(--foreground)',
            borderRadius: tokens.radius.md,
            boxSizing: 'border-box',
          }}
        />
      </Box>
      {!embedded && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <SortMenu
            sortOption={sortOption}
            showSortMenu={showSortMenu}
            onToggle={onSortMenuToggle}
            onSelect={onSortSelect}
          />
          <ViewToggle viewMode={viewMode} onSelect={onViewModeSelect} />
        </Box>
      )}
    </Box>
  );
}

export type { ViewMode, SortOption };
