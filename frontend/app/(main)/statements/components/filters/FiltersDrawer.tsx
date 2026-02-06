"use client";

import { DrawerShell } from "@/app/components/ui/drawer-shell";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/utils";
import { ChevronLeft } from "lucide-react";
import type {
  StatementFilterDateMode,
  StatementFilterDatePreset,
  StatementFilters,
} from "./statement-filters";
import { FilterSection } from "./FilterSection";
import { FilterRow } from "./FilterRow";
import { FilterOptionRow } from "./FilterOptionRow";
import { FilterAvatarRow } from "./FilterAvatarRow";

type FiltersDrawerLabels = {
  title: string;
  viewResults: string;
  saveSearch: string;
  resetFilters: string;
  general: string;
  expenses: string;
  reports: string;
  type: string;
  from: string;
  groupBy: string;
  has: string;
  keywords: string;
  limit: string;
  status: string;
  to: string;
  amount: string;
  approved: string;
  billable: string;
  currency: string;
  date: string;
  exported: string;
  paid: string;
  any: string;
  yes: string;
  no: string;
};

type FilterOption = {
  value: string;
  label: string;
};

type FilterDatePresetOption = {
  value: StatementFilterDatePreset;
  label: string;
};

type FilterDateModeOption = {
  value: StatementFilterDateMode;
  label: string;
};

type FilterAvatarOption = {
  id: string;
  label: string;
  description?: string | null;
  avatarUrl?: string | null;
  bankName?: string | null;
};

type FiltersDrawerProps = {
  open: boolean;
  onClose: () => void;
  filters: StatementFilters;
  screen: string;
  onBack: () => void;
  onSelect: (field: string) => void;
  onUpdateFilters: (next: Partial<StatementFilters>) => void;
  onResetAll: () => void;
  onViewResults: () => void;
  typeOptions: FilterOption[];
  statusOptions: FilterOption[];
  datePresets: FilterDatePresetOption[];
  dateModes: FilterDateModeOption[];
  fromOptions: FilterAvatarOption[];
  toOptions: FilterAvatarOption[];
  groupByOptions: FilterOption[];
  hasOptions: FilterOption[];
  currencyOptions: string[];
  labels: FiltersDrawerLabels;
  activeCount: number;
};

export function FiltersDrawer({
  open,
  onClose,
  filters,
  screen,
  onBack,
  onSelect,
  onUpdateFilters,
  onResetAll,
  onViewResults,
  typeOptions,
  statusOptions,
  datePresets,
  dateModes,
  fromOptions,
  toOptions,
  groupByOptions,
  hasOptions,
  currencyOptions,
  labels,
  activeCount,
}: FiltersDrawerProps) {
  const summaryValue = (value?: string | null, fallback?: string) =>
    value && value.length > 0 ? value : fallback || labels.any;

  const isRoot = screen === "root";
  const screenTitle = isRoot
    ? labels.title
    : {
        type: labels.type,
        status: labels.status,
        date: labels.date,
        from: labels.from,
        to: labels.to,
        keywords: labels.keywords,
        amount: labels.amount,
        approved: labels.approved,
        billable: labels.billable,
        groupBy: labels.groupBy,
        has: labels.has,
        limit: labels.limit,
        currency: labels.currency,
        exported: labels.exported,
        paid: labels.paid,
      }[screen] || labels.title;

  const toggleValue = (values: string[], value: string) =>
    values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

  const parseNumberInput = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const renderScreenContent = () => {
    if (screen === "type") {
      return (
        <div className="space-y-1">
          <FilterOptionRow
            label={labels.any}
            selected={!filters.type}
            onClick={() => onUpdateFilters({ type: null })}
            variant="radio"
          />
          {typeOptions.map((option) => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              selected={filters.type === option.value}
              onClick={() => onUpdateFilters({ type: option.value })}
              variant="radio"
            />
          ))}
        </div>
      );
    }

    if (screen === "status") {
      return (
        <div className="space-y-1">
          <FilterOptionRow
            label={labels.any}
            selected={filters.statuses.length === 0}
            onClick={() => onUpdateFilters({ statuses: [] })}
            variant="checkbox"
          />
          {statusOptions.map((option) => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              selected={filters.statuses.includes(option.value)}
              onClick={() =>
                onUpdateFilters({
                  statuses: toggleValue(filters.statuses, option.value),
                })
              }
              variant="checkbox"
            />
          ))}
        </div>
      );
    }

    if (screen === "date") {
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <FilterOptionRow
              label={labels.any}
              selected={!filters.date}
              onClick={() => onUpdateFilters({ date: null })}
              variant="radio"
            />
            {datePresets.map((option) => (
              <FilterOptionRow
                key={option.value}
                label={option.label}
                selected={filters.date?.preset === option.value}
                onClick={() => onUpdateFilters({ date: { preset: option.value } })}
                variant="radio"
              />
            ))}
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-1">
            {dateModes.map((option) => (
              <FilterOptionRow
                key={option.value}
                label={option.label}
                selected={filters.date?.mode === option.value}
                onClick={() =>
                  onUpdateFilters({
                    date: {
                      mode: option.value,
                      date:
                        filters.date?.date || new Date().toISOString().slice(0, 10),
                    },
                  })
                }
                variant="radio"
              />
            ))}
            {filters.date?.mode ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-3">
                <input
                  type="date"
                  value={filters.date?.date || ""}
                  onChange={(event) =>
                    onUpdateFilters({
                      date: {
                        mode: filters.date?.mode,
                        date: event.target.value,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    if (screen === "from" || screen === "to") {
      const values = screen === "from" ? filters.from : filters.to;
      const options = screen === "from" ? fromOptions : toOptions;
      if (options.length === 0) {
        return (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
            {labels.any}
          </div>
        );
      }
      return (
        <div className="space-y-1">
          {options.map((option) => (
            <FilterAvatarRow
              key={option.id}
              label={option.label}
              description={option.description}
              avatarUrl={option.avatarUrl}
              bankName={option.bankName}
              selected={values.includes(option.id)}
              onClick={() =>
                screen === "from"
                  ? onUpdateFilters({
                      from: toggleValue(values, option.id),
                    })
                  : onUpdateFilters({
                      to: toggleValue(values, option.id),
                    })
              }
            />
          ))}
        </div>
      );
    }

    if (screen === "keywords") {
      return (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-500">{labels.keywords}</div>
          <input
            value={filters.keywords}
            onChange={(event) => onUpdateFilters({ keywords: event.target.value })}
            placeholder={labels.keywords}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>
      );
    }

    if (screen === "amount") {
      return (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-500">Min</div>
            <input
              inputMode="decimal"
              value={filters.amountMin !== null ? String(filters.amountMin) : ""}
              onChange={(event) =>
                onUpdateFilters({ amountMin: parseNumberInput(event.target.value) })
              }
              placeholder="0"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Max</div>
            <input
              inputMode="decimal"
              value={filters.amountMax !== null ? String(filters.amountMax) : ""}
              onChange={(event) =>
                onUpdateFilters({ amountMax: parseNumberInput(event.target.value) })
              }
              placeholder="0"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </div>
      );
    }

    if (screen === "approved" || screen === "billable" || screen === "exported" || screen === "paid") {
      const currentValue =
        screen === "approved"
          ? filters.approved
          : screen === "billable"
            ? filters.billable
            : screen === "exported"
              ? filters.exported
              : filters.paid;
      const updateBooleanFilter = (value: boolean | null) => {
        if (screen === "approved") {
          onUpdateFilters({ approved: value });
          return;
        }
        if (screen === "billable") {
          onUpdateFilters({ billable: value });
          return;
        }
        if (screen === "exported") {
          onUpdateFilters({ exported: value });
          return;
        }
        onUpdateFilters({ paid: value });
      };
      return (
        <div className="space-y-1">
          <FilterOptionRow
            label={labels.any}
            selected={currentValue === null}
            onClick={() => updateBooleanFilter(null)}
            variant="radio"
          />
          <FilterOptionRow
            label={labels.yes}
            selected={currentValue === true}
            onClick={() => updateBooleanFilter(true)}
            variant="radio"
          />
          <FilterOptionRow
            label={labels.no}
            selected={currentValue === false}
            onClick={() => updateBooleanFilter(false)}
            variant="radio"
          />
        </div>
      );
    }

    if (screen === "groupBy") {
      return (
        <div className="space-y-1">
          <FilterOptionRow
            label={labels.any}
            selected={!filters.groupBy}
            onClick={() => onUpdateFilters({ groupBy: null })}
            variant="radio"
          />
          {groupByOptions.map((option) => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              selected={filters.groupBy === option.value}
              onClick={() => onUpdateFilters({ groupBy: option.value })}
              variant="radio"
            />
          ))}
        </div>
      );
    }

    if (screen === "has") {
      return (
        <div className="space-y-1">
          <FilterOptionRow
            label={labels.any}
            selected={filters.has.length === 0}
            onClick={() => onUpdateFilters({ has: [] })}
            variant="checkbox"
          />
          {hasOptions.map((option) => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              selected={filters.has.includes(option.value)}
              onClick={() =>
                onUpdateFilters({
                  has: toggleValue(filters.has, option.value),
                })
              }
              variant="checkbox"
            />
          ))}
        </div>
      );
    }

    if (screen === "limit") {
      return (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-500">{labels.limit}</div>
          <input
            inputMode="numeric"
            value={filters.limit !== null ? String(filters.limit) : ""}
            onChange={(event) =>
              onUpdateFilters({ limit: parseNumberInput(event.target.value) })
            }
            placeholder="0"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>
      );
    }

    if (screen === "currency") {
      if (currencyOptions.length === 0) {
        return (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
            {labels.any}
          </div>
        );
      }
      return (
        <div className="space-y-1">
          <FilterOptionRow
            label={labels.any}
            selected={filters.currencies.length === 0}
            onClick={() => onUpdateFilters({ currencies: [] })}
            variant="checkbox"
          />
          {currencyOptions.map((currency) => (
            <FilterOptionRow
              key={currency}
              label={currency}
              selected={filters.currencies.includes(currency)}
              onClick={() =>
                onUpdateFilters({
                  currencies: toggleValue(filters.currencies, currency),
                })
              }
              variant="checkbox"
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
          <div className="flex-1 overflow-y-auto space-y-6">
          <FilterSection title={labels.general}>
            <FilterRow
              label={labels.type}
              value={summaryValue(filters.type)}
              onClick={() => onSelect("type")}
            />
            <FilterRow
              label={labels.from}
              value={summaryValue(filters.from.length ? `${filters.from.length}` : "")}
              onClick={() => onSelect("from")}
            />
            <FilterRow
              label={labels.keywords}
              value={summaryValue(filters.keywords)}
              onClick={() => onSelect("keywords")}
            />
            <FilterRow
              label={labels.status}
              value={summaryValue(filters.statuses.length ? `${filters.statuses.length}` : "")}
              onClick={() => onSelect("status")}
            />
            <FilterRow
              label={labels.to}
              value={summaryValue(filters.to.length ? `${filters.to.length}` : "")}
              onClick={() => onSelect("to")}
            />
            <FilterRow
              label={labels.groupBy}
              value={summaryValue(filters.groupBy)}
              onClick={() => onSelect("groupBy")}
            />
            <FilterRow
              label={labels.has}
              value={summaryValue(filters.has.length ? `${filters.has.length}` : "")}
              onClick={() => onSelect("has")}
            />
            <FilterRow
              label={labels.limit}
              value={summaryValue(filters.limit ? `${filters.limit}` : "")}
              onClick={() => onSelect("limit")}
            />
          </FilterSection>

          <FilterSection title={labels.expenses}>
            <FilterRow
              label={labels.amount}
              value={summaryValue(filters.amountMin || filters.amountMax ? "set" : "")}
              onClick={() => onSelect("amount")}
            />
            <FilterRow
              label={labels.billable}
              value={
                filters.billable === null
                  ? labels.any
                  : filters.billable
                    ? labels.yes
                    : labels.no
              }
              onClick={() => onSelect("billable")}
            />
          </FilterSection>

          <FilterSection title={labels.reports}>
            <FilterRow
              label={labels.approved}
              value={
                filters.approved === null
                  ? labels.any
                  : filters.approved
                    ? labels.yes
                    : labels.no
              }
              onClick={() => onSelect("approved")}
            />
            <FilterRow
              label={labels.currency}
              value={summaryValue(filters.currencies.length > 0 ? `${filters.currencies.length}` : "")}
              onClick={() => onSelect("currency")}
            />
            <FilterRow
              label={labels.date}
              value={summaryValue(filters.date ? "set" : "")}
              onClick={() => onSelect("date")}
            />
            <FilterRow
              label={labels.exported}
              value={
                filters.exported === null
                  ? labels.any
                  : filters.exported
                    ? labels.yes
                    : labels.no
              }
              onClick={() => onSelect("exported")}
            />
            <FilterRow
              label={labels.paid}
              value={
                filters.paid === null
                  ? labels.any
                  : filters.paid
                    ? labels.yes
                    : labels.no
              }
              onClick={() => onSelect("paid")}
            />
          </FilterSection>
        </div>
      ) : (
          <div className="space-y-5">
            <div className="rounded-2xl bg-transparent p-0">
              {renderScreenContent()}
            </div>
          </div>
      )}

        {isRoot ? (
          <div className="sticky bottom-0 pt-4 pb-2 space-y-3 bg-[#fbfaf8]">
            <Button variant="secondary" className="w-full rounded-full" size="lg" disabled>
              {labels.saveSearch}
            </Button>
            <Button
              className="w-full rounded-full bg-emerald-500 hover:bg-emerald-600"
              size="lg"
              onClick={onViewResults}
            >
              {labels.viewResults}
              {activeCount > 0 ? (
                <span
                  className={cn(
                    "ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-semibold",
                  )}
                >
                  {activeCount}
                </span>
              ) : null}
            </Button>
          </div>
        ) : (
          <div className="sticky bottom-0 pt-4 pb-2 bg-[#fbfaf8]">
            <Button
              className="w-full rounded-full bg-emerald-500 hover:bg-emerald-600"
              size="lg"
              onClick={onViewResults}
            >
              {labels.viewResults}
              {activeCount > 0 ? (
                <span
                  className={cn(
                    "ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-semibold",
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
