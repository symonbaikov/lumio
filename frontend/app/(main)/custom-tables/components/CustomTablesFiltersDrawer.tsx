'use client';

import { Button } from '@/app/components/ui/button';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { cn } from '@/app/lib/utils';
import type {
  CustomTableSortOrder,
  CustomTableSourceFilter,
} from '@/app/lib/custom-table-actions';
import { ChevronLeft } from 'lucide-react';
import { FilterOptionRow } from '@/app/(main)/statements/components/filters/FilterOptionRow';
import { FilterRow } from '@/app/(main)/statements/components/filters/FilterRow';
import { FilterSection } from '@/app/(main)/statements/components/filters/FilterSection';

type FilterOption<T extends string> = {
  value: T;
  label: string;
};

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

type CustomTableFilters = {
  source: CustomTableSourceFilter;
  sortOrder: CustomTableSortOrder;
};

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
}: CustomTablesFiltersDrawerProps) {
  const isRoot = screen === 'root';
  const screenTitle = isRoot
    ? labels.title
    : screen === 'source'
      ? labels.source
      : labels.sort;

  const resolveOptionLabel = <T extends string>(
    options: FilterOption<T>[],
    value: T,
    fallback = labels.any,
  ) => options.find(option => option.value === value)?.label ?? fallback;

  const renderScreenContent = () => {
    if (screen === 'source') {
      return (
        <div className="space-y-1">
          <FilterOptionRow
            label={labels.any}
            selected={filters.source === 'all'}
            onClick={() => onUpdateFilters({ source: 'all' })}
            variant="radio"
          />
          {sourceOptions
            .filter(option => option.value !== 'all')
            .map(option => (
              <FilterOptionRow
                key={option.value}
                label={option.label}
                selected={filters.source === option.value}
                onClick={() => onUpdateFilters({ source: option.value })}
                variant="radio"
              />
            ))}
        </div>
      );
    }

    if (screen === 'sort') {
      return (
        <div className="space-y-1">
          {sortOptions.map(option => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              selected={filters.sortOrder === option.value}
              onClick={() => onUpdateFilters({ sortOrder: option.value })}
              variant="radio"
            />
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <DrawerShell
      isOpen={open}
      onClose={onClose}
      position="right"
      width="sm"
      showCloseButton={false}
      className="bg-[#fbfaf8] border-l-0"
      title={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={isRoot ? onClose : onBack}
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label={screenTitle}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-lg font-semibold text-gray-900">{screenTitle}</span>
          </div>
          {isRoot ? (
            <button
              type="button"
              onClick={onResetAll}
              className="text-sm font-semibold text-primary transition hover:text-primary-hover"
            >
              {labels.resetFilters}
            </button>
          ) : null}
        </div>
      }
    >
      <div className="flex h-full flex-col">
        {isRoot ? (
          <div className="flex-1 overflow-y-auto space-y-6 pb-28">
            <FilterSection title={labels.general}>
              <FilterRow
                label={labels.source}
                value={
                  filters.source === 'all'
                    ? labels.any
                    : resolveOptionLabel(sourceOptions, filters.source)
                }
                onClick={() => onSelect('source')}
              />
              <FilterRow
                label={labels.sort}
                value={resolveOptionLabel(sortOptions, filters.sortOrder, '')}
                onClick={() => onSelect('sort')}
              />
            </FilterSection>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-5 pb-20">
            <div className="rounded-2xl bg-transparent p-0">{renderScreenContent()}</div>
          </div>
        )}

        {isRoot ? (
          <div className="sticky bottom-0 pt-4 pb-2 space-y-3 bg-[#fbfaf8]">
            <Button variant="secondary" className="w-full rounded-full" size="lg" disabled>
              {labels.saveSearch}
            </Button>
            <Button className="w-full rounded-full" size="lg" onClick={onViewResults}>
              {labels.viewResults}
              {activeCount > 0 ? (
                <span
                  className={cn(
                    'ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-semibold',
                  )}
                >
                  {activeCount}
                </span>
              ) : null}
            </Button>
          </div>
        ) : (
          <div className="sticky bottom-0 pt-4 pb-2 bg-[#fbfaf8]">
            <Button className="w-full rounded-full" size="lg" onClick={onViewResults}>
              {labels.viewResults}
              {activeCount > 0 ? (
                <span
                  className={cn(
                    'ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-semibold',
                  )}
                >
                  {activeCount}
                </span>
              ) : null}
            </Button>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}
