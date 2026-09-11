'use client';

import { DateFilterDropdown } from '@/app/(main)/statements/components/filters/DateFilterDropdown';
import { FromFilterDropdown } from '@/app/(main)/statements/components/filters/FromFilterDropdown';
import { StatusFilterDropdown } from '@/app/(main)/statements/components/filters/StatusFilterDropdown';
import type { StatementFilterDate } from '@/app/(main)/statements/components/filters/statement-filters';
import { TypeFilterDropdown } from '@/app/(main)/statements/components/filters/TypeFilterDropdown';
import type { useTopCategoriesViewModel } from '@/app/(main)/statements/components/top-categories/hooks/useTopCategoriesViewModel';
import { filterLinkClassName } from '@/app/(main)/statements/helpers/analytics-filter-labels';
import { ChevronDown, SlidersHorizontal } from '@/app/components/icons';
import { FilterChipButton } from '@/app/components/ui/filter-chip-button';

type Props = { vm: ReturnType<typeof useTopCategoriesViewModel> };
type Option = { value: string; label: string };

type FindLabelParams = { options: Option[]; value: string | undefined; fallback: string };
const findLabel = ({ options, value, fallback }: FindLabelParams): string =>
  options.find(o => o.value === value)?.label ?? fallback;

type TypeTriggerParams = { type: string | null; options: Option[]; label: string };
const getTypeTriggerText = ({ type, options, label }: TypeTriggerParams): string =>
  type ? findLabel({ options, value: type, fallback: label }) : label;

const getStatusTriggerText = ({ count, label }: { count: number; label: string }): string =>
  count > 0 ? `${label} (${count})` : label;

type DateTriggerParams = {
  date: StatementFilterDate | null;
  presets: Option[];
  modes: Option[];
  label: string;
};
const getDateTriggerText = ({ date, presets, modes, label }: DateTriggerParams): string => {
  const preset = date?.preset;
  const mode = date?.mode;
  return preset
    ? findLabel({ options: presets, value: preset, fallback: label })
    : mode
      ? findLabel({ options: modes, value: mode, fallback: label })
      : label;
};

const getFromTriggerText = ({ count, label }: { count: number; label: string }): string =>
  count > 0 ? `${label} (${count})` : label;

export function TopCategoriesFilterChipsRow({ vm }: Props): React.JSX.Element {
  const { labels, filterOptions, filterState: fs } = vm;
  const { typeOptions, statusOptions, datePresets, dateModes } = filterOptions;
  const { draftFilters, typeDropdownOpen, statusDropdownOpen, dateDropdownOpen, fromDropdownOpen } =
    fs;
  const { setTypeDropdownOpen, setStatusDropdownOpen, setDateDropdownOpen, setFromDropdownOpen } =
    fs;
  const {
    updateFilter,
    applyAndClose,
    resetAndClose,
    setDraftFilters,
    setFiltersDrawerScreen,
    setFiltersDrawerOpen,
    activeFilterCount,
  } = fs;
  const typeTriggerText = getTypeTriggerText({
    type: draftFilters.type,
    options: typeOptions,
    label: labels.type,
  });
  const statusTriggerText = getStatusTriggerText({
    count: draftFilters.statuses.length,
    label: labels.status,
  });
  const dateTriggerText = getDateTriggerText({
    date: draftFilters.date,
    presets: datePresets,
    modes: dateModes,
    label: labels.date,
  });
  const fromTriggerText = getFromTriggerText({
    count: draftFilters.from.length,
    label: labels.from,
  });
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <TypeFilterDropdown
        open={typeDropdownOpen}
        onOpenChange={setTypeDropdownOpen}
        options={typeOptions}
        value={draftFilters.type}
        onChange={v => updateFilter({ type: v })}
        onApply={() => applyAndClose(() => setTypeDropdownOpen(false))}
        onReset={() => resetAndClose('type', () => setTypeDropdownOpen(false))}
        trigger={
          <FilterChipButton active={Boolean(draftFilters.type)}>
            {typeTriggerText}
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
            {statusTriggerText}
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
            {dateTriggerText}
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
            {fromTriggerText}
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
          setDraftFilters(fs.appliedFilters);
          setFiltersDrawerScreen('root');
          setFiltersDrawerOpen(true);
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
