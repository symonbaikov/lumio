'use client';

import {
  type CurrencySearchItem,
  buildCurrencySearchIndex,
} from '@/app/lib/statement-expense-drawer';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface CurrencySelectorProps {
  selectedCurrency: string | null;
  onSelect: (currency: string) => void;
  mode?: 'modal' | 'inline';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showLabel?: boolean;
  showTrigger?: boolean;
  title?: string;
  minimal?: boolean;
}

const DEFAULT_RECENT_CURRENCIES = ['USD', 'EUR', 'KZT', 'RUB'] as const;

export function CurrencySelector({
  selectedCurrency,
  onSelect,
  mode = 'modal',
  open,
  onOpenChange,
  showLabel = true,
  showTrigger = true,
  title = 'Select a currency',
  minimal = false,
}: CurrencySelectorProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [recentCurrencies, setRecentCurrencies] = useState<string[]>([
    ...DEFAULT_RECENT_CURRENCIES,
  ]);

  const isControlled = typeof open === 'boolean';
  const isOpen = isControlled ? Boolean(open) : internalOpen;

  const setOpenState = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const currencyItems = useMemo(() => buildCurrencySearchIndex(), []);

  const currencyByCode = useMemo(
    () => new Map(currencyItems.map(item => [item.code, item])),
    [currencyItems],
  );

  const selectedCurrencyItem = selectedCurrency ? currencyByCode.get(selectedCurrency) : null;
  const currencyQuery = search.trim().toLowerCase();

  const selectedMatchesSearch = useMemo(() => {
    if (!selectedCurrencyItem) return false;
    if (!currencyQuery) return true;
    return selectedCurrencyItem.searchText.includes(currencyQuery);
  }, [selectedCurrencyItem, currencyQuery]);

  const recentCurrencyItems = useMemo(
    () =>
      recentCurrencies
        .map(code => currencyByCode.get(code))
        .filter((item): item is CurrencySearchItem => Boolean(item))
        .filter(item => item.code !== selectedCurrency),
    [recentCurrencies, currencyByCode, selectedCurrency],
  );

  const allCurrencyItems = useMemo(() => {
    const source =
      currencyQuery.length > 0
        ? currencyItems.filter(item => item.searchText.includes(currencyQuery))
        : currencyItems;

    return source.filter(item => item.code !== selectedCurrency);
  }, [currencyItems, currencyQuery, selectedCurrency]);

  const pushRecentCurrency = (currencyCode: string) => {
    setRecentCurrencies(prev => [currencyCode, ...prev.filter(item => item !== currencyCode)]);
  };

  const handleSelectCurrency = (currencyCode: string) => {
    onSelect(currencyCode);
    pushRecentCurrency(currencyCode);
    setSearch('');
    setOpenState(false);
  };

  const panel = (
    <div
      className={`w-full ${minimal ? 'bg-transparent p-0 shadow-none' : 'rounded-2xl border border-border bg-card p-5 shadow-xl'}`}
    >
      {!minimal ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={() => {
              setOpenState(false);
              setSearch('');
            }}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close currency picker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className={minimal ? 'relative mb-2 mt-2' : 'relative mb-3'}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search"
          className={`w-full rounded-xl py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
            minimal ? 'border border-transparent bg-white' : 'border border-border bg-card'
          }`}
        />
      </div>

      <div
        className={`overflow-y-auto pr-1 ${minimal ? 'max-h-[34vh] space-y-1.5 md:max-h-[40vh]' : 'max-h-[72vh] space-y-3'}`}
      >
        {selectedCurrencyItem && selectedMatchesSearch ? (
          <button
            type="button"
            onClick={() => handleSelectCurrency(selectedCurrencyItem.code)}
            className={`flex w-full items-center justify-between bg-primary/10 text-left ${
              minimal ? 'rounded-lg px-3 py-2' : 'rounded-xl px-3 py-3'
            }`}
          >
            <span className="text-sm font-semibold text-primary">{selectedCurrencyItem.label}</span>
            <Check className="h-4 w-4 text-primary" />
          </button>
        ) : null}

        {currencyQuery.length === 0 && recentCurrencyItems.length > 0 ? (
          <div>
            {!minimal ? (
              <p className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Recents
              </p>
            ) : null}
            <div className={minimal ? 'mt-1.5 space-y-1' : 'mt-2 space-y-1'}>
              {recentCurrencyItems.map(item => (
                <button
                  key={`recent-${item.code}`}
                  type="button"
                  onClick={() => handleSelectCurrency(item.code)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 text-left transition-colors hover:bg-muted ${
                    minimal ? 'py-2' : 'py-2.5'
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          {!minimal ? (
            <p className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              All
            </p>
          ) : null}
          <div className={minimal ? 'mt-1.5 space-y-1' : 'mt-2 space-y-1'}>
            {allCurrencyItems.length > 0 ? (
              allCurrencyItems.map(item => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSelectCurrency(item.code)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 text-left transition-colors hover:bg-muted ${
                    minimal ? 'py-2' : 'py-2.5'
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </button>
              ))
            ) : (
              <p className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
                No currencies found
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {showLabel ? (
        <p className="mb-2 block text-sm font-medium text-foreground">Currency</p>
      ) : null}

      {showTrigger ? (
        <button
          type="button"
          onClick={() => setOpenState(true)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
        >
          <span className="truncate">{selectedCurrencyItem?.label || 'Select a currency'}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      ) : null}

      {isOpen ? (
        mode === 'inline' ? (
          <div className={minimal ? 'mt-1' : 'mt-3'}>{panel}</div>
        ) : (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-transparent p-4">
            <div className="w-full max-w-4xl">{panel}</div>
          </div>
        )
      ) : null}
    </div>
  );
}
