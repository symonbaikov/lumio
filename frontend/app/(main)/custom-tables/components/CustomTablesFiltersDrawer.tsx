'use client';

import Box from '@mui/material/Box';
import MuiButton from '@mui/material/Button';
import React from 'react';
import { FilterOptionRow } from '@/app/(main)/statements/components/filters/FilterOptionRow';
import { FilterRow } from '@/app/(main)/statements/components/filters/FilterRow';
import { FilterSection } from '@/app/(main)/statements/components/filters/FilterSection';
import { ChevronLeft } from '@/app/components/icons';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import type { CustomTableSortOrder, CustomTableSourceFilter } from '@/app/lib/custom-table-actions';
import { tokens } from '@/lib/theme-tokens';

type FilterOption<T extends string> = { value: T; label: string };
type FiltersLabels = {
  title: string;
  resetFilters: string;
  viewResults: string;
  saveSearch: string;
  general: string;
  source: string;
  sort: string;
  any: string;
};
type CustomTableFilters = { source: CustomTableSourceFilter; sortOrder: CustomTableSortOrder };

type CustomTablesFiltersDrawerProps = {
  open: boolean;
  onClose: () => void;
  filters: CustomTableFilters;
  screen: string;
  onBack: () => void;
  onSelect: (field: string) => void;
  onUpdateFilters: (next: Partial<CustomTableFilters>) => void;
  onResetAll: () => void;
  onViewResults: () => void;
  sourceOptions: FilterOption<CustomTableSourceFilter>[];
  sortOptions: FilterOption<CustomTableSortOrder>[];
  labels: FiltersLabels;
  activeCount: number;
};

type ActiveCountBadgeProps = { count: number };
function ActiveCountBadge({ count }: ActiveCountBadgeProps): React.JSX.Element | null {
  if (count === 0) {
    return null;
  }
  return (
    <Box
      component="span"
      sx={{
        ml: 1,
        display: 'inline-flex',
        height: 24,
        width: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: tokens.radius.full,
        bgcolor: 'rgba(255,255,255,0.2)',
        fontSize: '0.75rem',
        fontWeight: 600,
      }}
    >
      {count}
    </Box>
  );
}

type ViewResultsBtnProps = { label: string; activeCount: number; onClick: () => void };
function ViewResultsButton({
  label,
  activeCount,
  onClick,
}: ViewResultsBtnProps): React.JSX.Element {
  return (
    <MuiButton variant="contained" fullWidth size="large" onClick={onClick}>
      {label}
      <ActiveCountBadge count={activeCount} />
    </MuiButton>
  );
}

type ScreenContentProps = {
  screen: string;
  filters: CustomTableFilters;
  sourceOptions: FilterOption<CustomTableSourceFilter>[];
  sortOptions: FilterOption<CustomTableSortOrder>[];
  anyLabel: string;
  onUpdateFilters: (next: Partial<CustomTableFilters>) => void;
};
function ScreenContent({
  screen,
  filters,
  sourceOptions,
  sortOptions,
  anyLabel,
  onUpdateFilters,
}: ScreenContentProps): React.JSX.Element | null {
  if (screen === 'source') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <FilterOptionRow
          label={anyLabel}
          selected={filters.source === 'all'}
          onClick={() => onUpdateFilters({ source: 'all' })}
          variant="radio"
        />
        {sourceOptions
          .filter(o => o.value !== 'all')
          .map(o => (
            <FilterOptionRow
              key={o.value}
              label={o.label}
              selected={filters.source === o.value}
              onClick={() => onUpdateFilters({ source: o.value })}
              variant="radio"
            />
          ))}
      </Box>
    );
  }
  if (screen === 'sort') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {sortOptions.map(o => (
          <FilterOptionRow
            key={o.value}
            label={o.label}
            selected={filters.sortOrder === o.value}
            onClick={() => onUpdateFilters({ sortOrder: o.value })}
            variant="radio"
          />
        ))}
      </Box>
    );
  }
  return null;
}

type RootContentProps = {
  filters: CustomTableFilters;
  labels: FiltersLabels;
  sourceOptions: FilterOption<CustomTableSourceFilter>[];
  sortOptions: FilterOption<CustomTableSortOrder>[];
  activeCount: number;
  onSelect: (field: string) => void;
  onViewResults: () => void;
};
function RootContent({
  filters,
  labels,
  sourceOptions,
  sortOptions,
  activeCount,
  onSelect,
  onViewResults,
}: RootContentProps): React.JSX.Element {
  const sourceLabel =
    filters.source === 'all'
      ? labels.any
      : (sourceOptions.find(o => o.value === filters.source)?.label ?? labels.any);
  const sortLabel = sortOptions.find(o => o.value === filters.sortOrder)?.label ?? '';
  return (
    <>
      <Box
        sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, pb: 7 }}
      >
        <FilterSection title={labels.general}>
          <FilterRow label={labels.source} value={sourceLabel} onClick={() => onSelect('source')} />
          <FilterRow label={labels.sort} value={sortLabel} onClick={() => onSelect('sort')} />
        </FilterSection>
      </Box>
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          pt: 2,
          pb: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          bgcolor: 'background.paper',
        }}
      >
        <MuiButton variant="outlined" fullWidth size="large" disabled>
          {labels.saveSearch}
        </MuiButton>
        <ViewResultsButton
          label={labels.viewResults}
          activeCount={activeCount}
          onClick={onViewResults}
        />
      </Box>
    </>
  );
}

type DrawerTitleProps = {
  screenTitle: string;
  isRoot: boolean;
  resetLabel: string;
  onBack: () => void;
  onClose: () => void;
  onResetAll: () => void;
};
function DrawerTitle({
  screenTitle,
  isRoot,
  resetLabel,
  onBack,
  onClose,
  onResetAll,
}: DrawerTitleProps): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <button
          type="button"
          onClick={isRoot ? onClose : onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: tokens.radius.full,
            padding: 8,
            color: 'var(--muted-foreground)',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
          }}
          aria-label={screenTitle}
        >
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--foreground)' }}>
          {screenTitle}
        </span>
      </Box>
      {isRoot && (
        <button
          type="button"
          onClick={onResetAll}
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-primary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {resetLabel}
        </button>
      )}
    </Box>
  );
}

export function CustomTablesFiltersDrawer({
  open,
  onClose,
  filters,
  screen,
  onBack,
  onSelect,
  onUpdateFilters,
  onResetAll,
  onViewResults,
  sourceOptions,
  sortOptions,
  labels,
  activeCount,
}: CustomTablesFiltersDrawerProps): React.JSX.Element {
  const isRoot = screen === 'root';
  const screenTitle = isRoot ? labels.title : screen === 'source' ? labels.source : labels.sort;
  return (
    <DrawerShell
      isOpen={open}
      onClose={onClose}
      position="right"
      width="sm"
      showCloseButton={false}
      title={
        <DrawerTitle
          screenTitle={screenTitle}
          isRoot={isRoot}
          resetLabel={labels.resetFilters}
          onBack={onBack}
          onClose={onClose}
          onResetAll={onResetAll}
        />
      }
    >
      <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
        {isRoot ? (
          <RootContent
            filters={filters}
            labels={labels}
            sourceOptions={sourceOptions}
            sortOptions={sortOptions}
            activeCount={activeCount}
            onSelect={onSelect}
            onViewResults={onViewResults}
          />
        ) : (
          <>
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5,
                pb: 5,
              }}
            >
              <Box sx={{ bgcolor: 'transparent', p: 0 }}>
                <ScreenContent
                  screen={screen}
                  filters={filters}
                  sourceOptions={sourceOptions}
                  sortOptions={sortOptions}
                  anyLabel={labels.any}
                  onUpdateFilters={onUpdateFilters}
                />
              </Box>
            </Box>
            <Box sx={{ position: 'sticky', bottom: 0, pt: 2, pb: 1, bgcolor: 'background.paper' }}>
              <ViewResultsButton
                label={labels.viewResults}
                activeCount={activeCount}
                onClick={onViewResults}
              />
            </Box>
          </>
        )}
      </Box>
    </DrawerShell>
  );
}
