'use client';

import { Filter, Search, X } from '@/app/components/icons';
import { useLocale } from '@/app/i18n';
import { getCategoryDisplayName } from '@/app/lib/statement-categories';
import type { Category, FilterState } from './types';

type FilterTranslations = {
  searchPlaceholder: { value: string };
  filters: { value: string };
  statusFilter: { value: string };
  statusAll: { value: string };
  statusWarnings: { value: string };
  statusErrors: { value: string };
  statusUncategorized: { value: string };
  categoryFilter: { value: string };
  categoryAll: { value: string };
  clearFilters: { value: string };
};

interface TransactionFiltersBarProps {
  filters: FilterState;
  categories: Category[];
  hasActiveFilters: boolean;
  showFilters: boolean;
  onFilterChange: (f: FilterState) => void;
  onToggleFilters: () => void;
  onClearFilters: () => void;
  t: FilterTranslations;
}

interface FilterToggleButtonProps {
  hasActiveFilters: boolean;
  activeCount: number;
  filterLabel: string;
  onClick: () => void;
}

function FilterToggleButton({
  hasActiveFilters,
  activeCount,
  filterLabel,
  onClick,
}: FilterToggleButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`lumio-tx-filters__toggle-btn${hasActiveFilters ? ' lumio-tx-filters__toggle-btn--active' : ''}`}
    >
      <Filter size={16} />
      {filterLabel}
      {hasActiveFilters && <span className="lumio-tx-filters__count">{activeCount}</span>}
    </button>
  );
}

interface StatusSelectProps {
  filters: FilterState;
  onFilterChange: (f: FilterState) => void;
  t: FilterTranslations;
}

function StatusSelect({ filters, onFilterChange, t }: StatusSelectProps): React.ReactElement {
  return (
    <div className="lumio-tx-filters__select-wrap">
      <label htmlFor="status-filter" className="lumio-tx-filters__label">
        {t.statusFilter.value}
      </label>
      <select
        id="status-filter"
        value={filters.status}
        onChange={e =>
          onFilterChange({ ...filters, status: e.target.value as FilterState['status'] })
        }
        className="lumio-tx-filters__select"
      >
        <option value="all">{t.statusAll.value}</option>
        <option value="warnings">{t.statusWarnings.value}</option>
        <option value="errors">{t.statusErrors.value}</option>
        <option value="uncategorized">{t.statusUncategorized.value}</option>
      </select>
    </div>
  );
}

interface CategorySelectProps {
  filters: FilterState;
  categories: Category[];
  onFilterChange: (f: FilterState) => void;
  t: FilterTranslations;
}

function CategorySelect({
  filters,
  categories,
  onFilterChange,
  t,
}: CategorySelectProps): React.ReactElement {
  const { locale } = useLocale();
  return (
    <div className="lumio-tx-filters__select-wrap">
      <label htmlFor="category-filter" className="lumio-tx-filters__label">
        {t.categoryFilter.value}
      </label>
      <select
        id="category-filter"
        value={filters.category ?? ''}
        onChange={e => onFilterChange({ ...filters, category: e.target.value || null })}
        className="lumio-tx-filters__select"
      >
        <option value="">{t.categoryAll.value}</option>
        {categories.map(cat => (
          <option key={cat.id} value={cat.id}>
            {getCategoryDisplayName(cat, locale)}
          </option>
        ))}
      </select>
    </div>
  );
}

interface FilterPanelProps {
  filters: FilterState;
  categories: Category[];
  hasActiveFilters: boolean;
  onFilterChange: (f: FilterState) => void;
  onClearFilters: () => void;
  t: FilterTranslations;
}

function FilterPanel({
  filters,
  categories,
  hasActiveFilters,
  onFilterChange,
  onClearFilters,
  t,
}: FilterPanelProps): React.ReactElement {
  return (
    <div className="lumio-tx-filters__panel">
      <div className="lumio-tx-filters__panel-inner">
        <StatusSelect filters={filters} onFilterChange={onFilterChange} t={t} />
        <CategorySelect
          filters={filters}
          categories={categories}
          onFilterChange={onFilterChange}
          t={t}
        />
        {hasActiveFilters && (
          <button type="button" onClick={onClearFilters} className="lumio-tx-filters__clear-btn">
            {t.clearFilters.value}
          </button>
        )}
      </div>
    </div>
  );
}

export function TransactionFiltersBar({
  filters,
  categories,
  hasActiveFilters,
  showFilters,
  onFilterChange,
  onToggleFilters,
  onClearFilters,
  t,
}: TransactionFiltersBarProps): React.ReactElement {
  const activeCount = (filters.status !== 'all' ? 1 : 0) + (filters.category ? 1 : 0);

  return (
    <div className="lumio-tx-filters">
      <div className="lumio-tx-filters__top">
        <div className="lumio-tx-filters__search-wrap">
          <Search size={16} className="lumio-tx-filters__search-icon" />
          <input
            type="text"
            placeholder={t.searchPlaceholder.value}
            value={filters.search}
            onChange={e => onFilterChange({ ...filters, search: e.target.value })}
            className="lumio-tx-filters__search"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, search: '' })}
              className="lumio-tx-filters__clear-search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <FilterToggleButton
          hasActiveFilters={hasActiveFilters}
          activeCount={activeCount}
          filterLabel={t.filters.value}
          onClick={onToggleFilters}
        />
      </div>
      {showFilters && (
        <FilterPanel
          filters={filters}
          categories={categories}
          hasActiveFilters={hasActiveFilters}
          onFilterChange={onFilterChange}
          onClearFilters={onClearFilters}
          t={t}
        />
      )}
    </div>
  );
}
