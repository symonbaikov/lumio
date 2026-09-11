'use client';

import { DateFilterDropdown } from '@/app/(main)/statements/components/filters/DateFilterDropdown';
import { FromFilterDropdown } from '@/app/(main)/statements/components/filters/FromFilterDropdown';
import { GroupByFilterDropdown } from '@/app/(main)/statements/components/filters/GroupByFilterDropdown';
import { StatusFilterDropdown } from '@/app/(main)/statements/components/filters/StatusFilterDropdown';
import { ViewFilterDropdown } from '@/app/(main)/statements/components/filters/ViewFilterDropdown';
import type { useSpendOverTimeViewModel } from '@/app/(main)/statements/components/spend-over-time/hooks/useSpendOverTimeViewModel';
import type { SpendOverTimeGroupBy } from '@/app/(main)/statements/components/spend-over-time.utils';
import { filterLinkClassName } from '@/app/(main)/statements/helpers/analytics-filter-labels';
import { ChevronDown, SlidersHorizontal } from '@/app/components/icons';
import { FilterChipButton } from '@/app/components/ui/filter-chip-button';

type Props = { vm: ReturnType<typeof useSpendOverTimeViewModel> };

type CountLabelParams = { count: number; label: string };
const getStatusTriggerText = ({ count, label }: CountLabelParams): string =>
  count > 0 ? `${label} (${count})` : label;
const getFromTriggerText = ({ count, label }: CountLabelParams): string =>
  count > 0 ? `${label} (${count})` : label;

type DateOption = { value: string; label: string };
type FindOptionParams = { options: DateOption[]; value: string | null | undefined };
const findOptionLabel = ({ options, value }: FindOptionParams): string | undefined =>
  value ? options.find(o => o.value === value)?.label : undefined;

type DateTriggerParams = {
  date: { preset?: string | null; mode?: string | null } | null;
  presets: DateOption[];
  modes: DateOption[];
  label: string;
};
const getDateTriggerText = ({ date, presets, modes, label }: DateTriggerParams): string => {
  const preset = date ? date.preset : null;
  const mode = date ? date.mode : null;
  return (
    findOptionLabel({ options: presets, value: preset }) ??
    findOptionLabel({ options: modes, value: mode }) ??
    label
  );
};

export function SpendOverTimeFilterChipsRow({ vm }: Props): React.JSX.Element {
  const { labels, filterOptions, groupByOptions, viewOptions, defaultGroupBy, defaultView } = vm;
  const { statusOptions, datePresets, dateModes } = filterOptions;
  const {
    draftFilters,
    statusDropdownOpen,
    dateDropdownOpen,
    fromDropdownOpen,
    groupByDropdownOpen,
    viewDropdownOpen,
  } = vm;
  const {
    setStatusDropdownOpen,
    setDateDropdownOpen,
    setFromDropdownOpen,
    setGroupByDropdownOpen,
    setViewDropdownOpen,
  } = vm;
  const {
    updateFilter,
    applyAndClose,
    resetAndClose,
    setDraftFilters,
    setDraftGroupBy,
    setDraftViewType,
    setFiltersDrawerScreen,
    setFiltersDrawerOpen,
    activeFilterCount,
    applyFilterChanges,
  } = vm;
  const statusText = getStatusTriggerText({
    count: draftFilters.statuses.length,
    label: labels.status,
  });
  const dateText = getDateTriggerText({
    date: draftFilters.date,
    presets: datePresets,
    modes: dateModes,
    label: labels.date,
  });
  const fromText = getFromTriggerText({ count: draftFilters.from.length, label: labels.from });
  const isCalendarView = vm.draftViewType === 'calendar';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      {!isCalendarView ? (
        <GroupByFilterDropdown
          open={groupByDropdownOpen}
          onOpenChange={setGroupByDropdownOpen}
          options={groupByOptions}
          value={vm.draftGroupBy}
          onChange={v => setDraftGroupBy(v as SpendOverTimeGroupBy)}
          onApply={() => applyAndClose(() => setGroupByDropdownOpen(false))}
          onReset={() => {
            setDraftGroupBy(defaultGroupBy as SpendOverTimeGroupBy);
            setGroupByDropdownOpen(false);
          }}
          trigger={
            <FilterChipButton active>
              Group by: {groupByOptions.find(o => o.value === vm.draftGroupBy)?.label}
              <ChevronDown size={14} />
            </FilterChipButton>
          }
          applyLabel={labels.apply}
          resetLabel={labels.reset}
        />
      ) : null}
      <ViewFilterDropdown
        open={viewDropdownOpen}
        onOpenChange={setViewDropdownOpen}
        options={viewOptions}
        value={vm.draftViewType}
        onChange={v => {
          setDraftViewType(v as 'calendar' | 'line' | 'bar' | 'stacked');
          if (v === 'calendar') {
            setDraftGroupBy('day');
          }
        }}
        onApply={() => applyAndClose(() => setViewDropdownOpen(false))}
        onReset={() => {
          setDraftViewType(defaultView as 'calendar' | 'line' | 'bar' | 'stacked');
          setDraftGroupBy(defaultGroupBy as SpendOverTimeGroupBy);
          setViewDropdownOpen(false);
        }}
        trigger={
          <FilterChipButton active>
            View: {viewOptions.find(o => o.value === vm.draftViewType)?.label}
            <ChevronDown size={14} />
          </FilterChipButton>
        }
        applyLabel={labels.apply}
        resetLabel={labels.reset}
      />
      <StatusFilterDropdown
        open={statusDropdownOpen}
        onOpenChange={setStatusDropdownOpen}
        options={statusOptions}
        values={draftFilters.statuses}
        onChange={v => updateFilter({ statuses: v })}
        onApply={() => applyAndClose(() => setStatusDropdownOpen(false))}
        onReset={() => resetAndClose('statuses', () => setStatusDropdownOpen(false))}
        trigger={
          <FilterChipButton active={draftFilters.statuses.length > 0}>
            {statusText}
            <ChevronDown size={14} />
          </FilterChipButton>
        }
        applyLabel={labels.apply}
        resetLabel={labels.reset}
      />
      <DateFilterDropdown
        open={dateDropdownOpen}
        onOpenChange={setDateDropdownOpen}
        presets={datePresets}
        modes={dateModes}
        value={draftFilters.date}
        onChange={v => updateFilter({ date: v })}
        onApply={() => applyAndClose(() => setDateDropdownOpen(false))}
        onReset={() => resetAndClose('date', () => setDateDropdownOpen(false))}
        trigger={
          <FilterChipButton active={Boolean(draftFilters.date)}>
            {dateText}
            <ChevronDown size={14} />
          </FilterChipButton>
        }
        applyLabel={labels.apply}
        resetLabel={labels.reset}
      />
      <FromFilterDropdown
        open={fromDropdownOpen}
        onOpenChange={setFromDropdownOpen}
        options={vm.fromOptions}
        values={draftFilters.from}
        onChange={v => updateFilter({ from: v })}
        onApply={() => applyAndClose(() => setFromDropdownOpen(false))}
        onReset={() => resetAndClose('from', () => setFromDropdownOpen(false))}
        trigger={
          <FilterChipButton active={draftFilters.from.length > 0}>
            {fromText}
            <ChevronDown size={14} />
          </FilterChipButton>
        }
        applyLabel={labels.apply}
        resetLabel={labels.reset}
      />
      <button
        type="button"
        className={filterLinkClassName}
        onClick={() => {
          setDraftFilters(vm.appliedFilters);
          setDraftGroupBy(vm.groupBy);
          setDraftViewType(vm.viewType);
          setFiltersDrawerScreen('root');
          setFiltersDrawerOpen(true);
          applyFilterChanges();
        }}
      >
        <SlidersHorizontal size={14} />
        {labels.filters}
        {activeFilterCount > 0 ? (
          <span className="lumio-view-page__filter-badge">{activeFilterCount}</span>
        ) : null}
      </button>
    </div>
  );
}
