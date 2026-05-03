'use client';

import { DateFilterDropdown } from '@/app/(main)/statements/components/filters/DateFilterDropdown';
import { FiltersDrawer } from '@/app/(main)/statements/components/filters/FiltersDrawer';
import { FromFilterDropdown } from '@/app/(main)/statements/components/filters/FromFilterDropdown';
import { StatusFilterDropdown } from '@/app/(main)/statements/components/filters/StatusFilterDropdown';
import { TypeFilterDropdown } from '@/app/(main)/statements/components/filters/TypeFilterDropdown';
import { ColumnsDrawer } from '@/app/(main)/statements/components/columns/ColumnsDrawer';
import type { StatementColumn, StatementColumnId } from '@/app/(main)/statements/components/columns/statement-columns';
import type { StatementFilters } from '@/app/(main)/statements/components/filters/statement-filters';
import { FilterChipButton } from '@/app/components/ui/filter-chip-button';
import { Spinner } from '@/app/components/ui/spinner';
import { ChevronDown, Columns2, Copy, Search, SlidersHorizontal } from '@/app/components/icons';
import { SHORTCUT_FOCUS_SEARCH, SHORTCUT_OPEN_FILTERS } from '@/app/lib/keyboard-shortcuts';
import { type ComponentPropsWithoutRef, type JSX, useEffect, useRef } from 'react';
import { StatementsBulkActions } from './StatementsBulkActions';
import { tokens } from '@/lib/theme-tokens';

interface FilterOption {
  value: string;
  label: string;
}

interface DatePreset {
  value: 'thisMonth' | 'lastMonth' | 'yearToDate';
  label: string;
}

interface DateMode {
  value: 'on' | 'after' | 'before';
  label: string;
}

interface FromOption {
  id: string;
  label: string;
  description?: string | null;
  avatarUrl?: string | null;
  iconUrl?: string | null;
  bankName?: string | null;
}

interface GroupByOption {
  value: string;
  label: string;
}

interface HasOption {
  value: string;
  label: string;
}

interface FilterLabels {
  type: string;
  status: string;
  date: string;
  from: string;
  filters: string;
  columns: string;
}

interface FilterOptionLabels {
  apply: string;
  reset: string;
  resetFilters: string;
  viewResults: string;
  save: string;
  saveSearch: string;
  any: string;
  yes: string;
  no: string;
  drawerTitle: string;
  drawerGeneral: string;
  drawerExpenses: string;
  drawerReports: string;
  drawerGroupBy: string;
  drawerHas: string;
  drawerKeywords: string;
  drawerLimit: string;
  drawerTo: string;
  drawerAmount: string;
  drawerApproved: string;
  drawerBillable: string;
  hasCurrency: string;
  columnExported: string;
  paid: string;
  columnsTitle: string;
}

interface Props {
  searchInput: string;
  searchPlaceholder: string;
  selectedCount: number;
  selectedActionsOpen: boolean;
  hasSelectedDuplicates: boolean;
  loading: boolean;
  draftFilters: StatementFilters;
  activeFilterCount: number;
  typeDropdownOpen: boolean;
  statusDropdownOpen: boolean;
  dateDropdownOpen: boolean;
  fromDropdownOpen: boolean;
  filtersDrawerOpen: boolean;
  filtersDrawerScreen: string;
  columnsDrawerOpen: boolean;
  columnsWithLabels: StatementColumn[];
  visibleFilterScreens: string[];
  duplicateStatementIds: string[];
  typeOptions: FilterOption[];
  statusOptions: FilterOption[];
  datePresets: DatePreset[];
  dateModes: DateMode[];
  fromOptions: FromOption[];
  toOptions: FromOption[];
  groupByOptions: GroupByOption[];
  hasOptions: HasOption[];
  currencyOptions: string[];
  filterLabels: FilterLabels;
  filterOptionLabels: FilterOptionLabels;
  mergeDuplicatesLabel: string;
  dismissDuplicateLabel: string;
  markDuplicateLabel: string;
  selectDuplicatesLabel: string;
  onSearchChange: (value: string) => void;
  onToggleActionsOpen: () => void;
  onMerge: () => void;
  onDismiss: () => void;
  onMarkDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
  onSelectDetectedDuplicates: () => void;
  onTypeDropdownChange: (open: boolean) => void;
  onStatusDropdownChange: (open: boolean) => void;
  onDateDropdownChange: (open: boolean) => void;
  onFromDropdownChange: (open: boolean) => void;
  onFiltersDrawerClose: () => void;
  onFiltersDrawerOpen: () => void;
  onFiltersBack: () => void;
  onFiltersSelect: (field: string) => void;
  onUpdateFilters: (next: Partial<StatementFilters>) => void;
  onResetAllFilters: () => void;
  onViewResults: () => void;
  onApplyType: () => void;
  onResetType: () => void;
  onApplyStatus: () => void;
  onResetStatus: () => void;
  onApplyDate: () => void;
  onResetDate: () => void;
  onApplyFrom: () => void;
  onResetFrom: () => void;
  onColumnsClose: () => void;
  onColumnsOpen: () => void;
  onColumnsToggle: (id: StatementColumnId, visible: boolean) => void;
  onColumnsReorder: (activeId: StatementColumnId, overId: StatementColumnId) => void;
  onColumnsSave: () => void;
}

function TypeChipLabel({
  draftFilters,
  typeOptions,
  fallbackLabel,
  ...rest
}: {
  draftFilters: StatementFilters;
  typeOptions: FilterOption[];
  fallbackLabel: string;
  [key: string]: unknown;
}): React.JSX.Element {
  const label = draftFilters.type
    ? (typeOptions.find(o => o.value === draftFilters.type)?.label ?? fallbackLabel)
    : fallbackLabel;
  return (
    <FilterChipButton active={Boolean(draftFilters.type)} {...(rest as ComponentPropsWithoutRef<typeof FilterChipButton>)}>
      {label}
      <ChevronDown size={14} />
    </FilterChipButton>
  );
}

function DateChipLabel({
  draftFilters,
  datePresets,
  dateModes,
  fallbackLabel,
  ...rest
}: {
  draftFilters: StatementFilters;
  datePresets: DatePreset[];
  dateModes: DateMode[];
  fallbackLabel: string;
  [key: string]: unknown;
}): React.JSX.Element {
  const label = draftFilters.date?.preset
    ? (datePresets.find(o => o.value === draftFilters.date?.preset)?.label ?? fallbackLabel)
    : draftFilters.date?.mode
      ? (dateModes.find(o => o.value === draftFilters.date?.mode)?.label ?? fallbackLabel)
      : fallbackLabel;
  return (
    <FilterChipButton active={Boolean(draftFilters.date)} {...(rest as ComponentPropsWithoutRef<typeof FilterChipButton>)}>
      {label}
      <ChevronDown size={14} />
    </FilterChipButton>
  );
}

export function StatementsListHeader({
  searchInput,
  searchPlaceholder,
  selectedCount,
  selectedActionsOpen,
  hasSelectedDuplicates,
  loading,
  draftFilters,
  activeFilterCount,
  typeDropdownOpen,
  statusDropdownOpen,
  dateDropdownOpen,
  fromDropdownOpen,
  filtersDrawerOpen,
  filtersDrawerScreen,
  columnsDrawerOpen,
  columnsWithLabels,
  visibleFilterScreens,
  duplicateStatementIds,
  typeOptions,
  statusOptions,
  datePresets,
  dateModes,
  fromOptions,
  toOptions,
  groupByOptions,
  hasOptions,
  currencyOptions,
  filterLabels,
  filterOptionLabels,
  mergeDuplicatesLabel,
  dismissDuplicateLabel,
  markDuplicateLabel,
  selectDuplicatesLabel,
  onSearchChange,
  onToggleActionsOpen,
  onMerge,
  onDismiss,
  onMarkDuplicate,
  onExport,
  onDelete,
  onSelectDetectedDuplicates,
  onTypeDropdownChange,
  onStatusDropdownChange,
  onDateDropdownChange,
  onFromDropdownChange,
  onFiltersDrawerClose,
  onFiltersDrawerOpen,
  onFiltersBack,
  onFiltersSelect,
  onUpdateFilters,
  onResetAllFilters,
  onViewResults,
  onApplyType,
  onResetType,
  onApplyStatus,
  onResetStatus,
  onApplyDate,
  onResetDate,
  onApplyFrom,
  onResetFrom,
  onColumnsClose,
  onColumnsOpen,
  onColumnsToggle,
  onColumnsReorder,
  onColumnsSave,
}: Props): React.JSX.Element {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleFocusSearch = (): void => { searchRef.current?.focus(); };
    const handleOpenFilters = (): void => { onFiltersDrawerOpen(); };
    window.addEventListener(SHORTCUT_FOCUS_SEARCH, handleFocusSearch);
    window.addEventListener(SHORTCUT_OPEN_FILTERS, handleOpenFilters);
    return () => {
      window.removeEventListener(SHORTCUT_FOCUS_SEARCH, handleFocusSearch);
      window.removeEventListener(SHORTCUT_OPEN_FILTERS, handleOpenFilters);
    };
  }, [onFiltersDrawerOpen]);

  return (
    <div
      className="lumio-stmt-list-view__header"
      style={{ marginBottom: 24, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="lumio-stmt-list-view__search" data-tour-id="search-bar">
          <Search className="lumio-stmt-list-view__search-icon" size={16} />
          <input
            ref={searchRef}
            type="text"
            value={searchInput}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="lumio-stmt-list-view__search-input"
          />
        </div>
      </div>

      {selectedCount > 0 ? (
        <StatementsBulkActions
          selectedCount={selectedCount}
          selectedActionsOpen={selectedActionsOpen}
          hasSelectedDuplicates={hasSelectedDuplicates}
          mergeDuplicatesLabel={mergeDuplicatesLabel}
          dismissDuplicateLabel={dismissDuplicateLabel}
          markDuplicateLabel={markDuplicateLabel}
          onToggleActionsOpen={onToggleActionsOpen}
          onMerge={onMerge}
          onDismiss={onDismiss}
          onMarkDuplicate={onMarkDuplicate}
          onExport={onExport}
          onDelete={onDelete}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
          }}
          data-tour-id="statements-filters"
        >
          <TypeFilterDropdown
            open={typeDropdownOpen}
            onOpenChange={onTypeDropdownChange}
            options={typeOptions}
            value={draftFilters.type}
            onChange={value => onUpdateFilters({ type: value })}
            onApply={onApplyType}
            onReset={onResetType}
            trigger={
              <TypeChipLabel
                draftFilters={draftFilters}
                typeOptions={typeOptions}
                fallbackLabel={filterLabels.type}
              />
            }
            applyLabel={filterOptionLabels.apply}
            resetLabel={filterOptionLabels.reset}
          />

          <StatusFilterDropdown
            open={statusDropdownOpen}
            onOpenChange={onStatusDropdownChange}
            options={statusOptions}
            values={draftFilters.statuses}
            onChange={values => onUpdateFilters({ statuses: values })}
            onApply={onApplyStatus}
            onReset={onResetStatus}
            trigger={
              <FilterChipButton active={draftFilters.statuses.length > 0}>
                {draftFilters.statuses.length > 0
                  ? `${filterLabels.status} (${draftFilters.statuses.length})`
                  : filterLabels.status}
                <ChevronDown size={14} />
              </FilterChipButton>
            }
            applyLabel={filterOptionLabels.apply}
            resetLabel={filterOptionLabels.reset}
          />

          <DateFilterDropdown
            open={dateDropdownOpen}
            onOpenChange={onDateDropdownChange}
            presets={datePresets}
            modes={dateModes}
            value={draftFilters.date}
            onChange={value => onUpdateFilters({ date: value })}
            onApply={onApplyDate}
            onReset={onResetDate}
            trigger={
              <DateChipLabel
                draftFilters={draftFilters}
                datePresets={datePresets}
                dateModes={dateModes}
                fallbackLabel={filterLabels.date}
              />
            }
            applyLabel={filterOptionLabels.apply}
            resetLabel={filterOptionLabels.reset}
          />

          <FromFilterDropdown
            open={fromDropdownOpen}
            onOpenChange={onFromDropdownChange}
            options={fromOptions}
            values={draftFilters.from}
            onChange={values => onUpdateFilters({ from: values })}
            onApply={onApplyFrom}
            onReset={onResetFrom}
            trigger={
              <FilterChipButton active={draftFilters.from.length > 0}>
                {draftFilters.from.length > 0
                  ? `${filterLabels.from} (${draftFilters.from.length})`
                  : filterLabels.from}
                <ChevronDown size={14} />
              </FilterChipButton>
            }
            applyLabel={filterOptionLabels.apply}
            resetLabel={filterOptionLabels.reset}
          />

          {loading || duplicateStatementIds.length > 0 ? (
            <button
              type="button"
              className="lumio-stmt-list-view__duplicate-chip"
              onClick={onSelectDetectedDuplicates}
              disabled={loading || duplicateStatementIds.length === 0}
            >
              <Copy size={14} />
              {selectDuplicatesLabel}
              <span className="lumio-stmt-list-view__duplicate-count">
                {loading ? <Spinner size={12} /> : duplicateStatementIds.length}
              </span>
            </button>
          ) : null}

          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              borderRadius: tokens.radius.md,
              padding: '6px 8px',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--primary)',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
            }}
            onClick={onFiltersDrawerOpen}
          >
            <SlidersHorizontal size={14} />
            {filterLabels.filters}
            {activeFilterCount > 0 ? (
              <span
                style={{
                  marginLeft: 4,
                  display: 'inline-flex',
                  height: 20,
                  width: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: tokens.radius.full,
                  background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--primary)',
                }}
              >
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              borderRadius: tokens.radius.md,
              padding: '6px 8px',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--primary)',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
            }}
            onClick={onColumnsOpen}
          >
            <Columns2 size={14} />
            {filterLabels.columns}
          </button>
        </div>
      )}

      <FiltersDrawer
        open={filtersDrawerOpen}
        onClose={onFiltersDrawerClose}
        filters={draftFilters}
        screen={filtersDrawerScreen}
        visibleScreens={visibleFilterScreens}
        onBack={onFiltersBack}
        onSelect={onFiltersSelect}
        onUpdateFilters={onUpdateFilters}
        onResetAll={onResetAllFilters}
        onViewResults={onViewResults}
        typeOptions={typeOptions}
        statusOptions={statusOptions}
        datePresets={datePresets}
        dateModes={dateModes}
        fromOptions={fromOptions}
        toOptions={toOptions}
        groupByOptions={groupByOptions}
        hasOptions={hasOptions}
        currencyOptions={currencyOptions}
        labels={{
          title: filterOptionLabels.drawerTitle,
          viewResults: filterOptionLabels.viewResults,
          saveSearch: filterOptionLabels.saveSearch,
          resetFilters: filterOptionLabels.resetFilters,
          general: filterOptionLabels.drawerGeneral,
          expenses: filterOptionLabels.drawerExpenses,
          reports: filterOptionLabels.drawerReports,
          type: filterLabels.type,
          from: filterLabels.from,
          groupBy: filterOptionLabels.drawerGroupBy,
          has: filterOptionLabels.drawerHas,
          keywords: filterOptionLabels.drawerKeywords,
          limit: filterOptionLabels.drawerLimit,
          status: filterLabels.status,
          to: filterOptionLabels.drawerTo,
          amount: filterOptionLabels.drawerAmount,
          approved: filterOptionLabels.drawerApproved,
          billable: filterOptionLabels.drawerBillable,
          currency: filterOptionLabels.hasCurrency,
          date: filterLabels.date,
          exported: filterOptionLabels.columnExported,
          paid: filterOptionLabels.paid,
          any: filterOptionLabels.any,
          yes: filterOptionLabels.yes,
          no: filterOptionLabels.no,
        }}
        activeCount={activeFilterCount}
      />

      <ColumnsDrawer
        open={columnsDrawerOpen}
        onClose={onColumnsClose}
        columns={columnsWithLabels}
        onToggle={onColumnsToggle}
        onReorder={onColumnsReorder}
        onSave={onColumnsSave}
        labels={{
          title: filterOptionLabels.columnsTitle,
          save: filterOptionLabels.save,
        }}
      />
    </div>
  );
}
