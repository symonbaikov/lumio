'use client';

import { DrawerShell } from '@/app/components/ui/drawer-shell';
import {
  type StatementCategoryNode,
  filterStatementCategories,
} from '@/app/lib/statement-categories';
import { Check, ChevronLeft, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type StatementCategoryDrawerLabels = {
  title: string;
  searchPlaceholder: string;
  allOption: string;
  noResults: string;
};

type StatementCategoryDrawerProps = {
  open: boolean;
  onClose: () => void;
  categories: StatementCategoryNode[];
  selectedCategoryId: string;
  selecting: boolean;
  onSelect: (categoryId: string) => void;
  labels: StatementCategoryDrawerLabels;
};

export default function StatementCategoryDrawer({
  open,
  onClose,
  categories,
  selectedCategoryId,
  selecting,
  onSelect,
  labels,
}: StatementCategoryDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const filteredCategories = useMemo(
    () => filterStatementCategories(categories, searchQuery),
    [categories, searchQuery],
  );

  return (
    <DrawerShell
      isOpen={open}
      onClose={onClose}
      position="right"
      width="sm"
      showCloseButton={false}
      className="bg-[#fbfaf8] border-l-0"
      title={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label={labels.title}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-lg font-semibold text-[#073b32]">{labels.title}</span>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-gray-100 pb-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder={labels.searchPlaceholder}
              className="h-14 w-full rounded-2xl border border-emerald-400 bg-white pl-12 pr-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-transparent">
            <button
              type="button"
              disabled={selecting}
              onClick={() => onSelect('')}
              className={`flex w-full items-center justify-between px-4 py-5 text-left text-base font-semibold transition-colors ${
                selectedCategoryId === ''
                  ? 'bg-[#ede8e1] text-[#073b32]'
                  : 'text-[#073b32] hover:bg-gray-50'
              }`}
            >
              <span>{labels.allOption}</span>
              {selectedCategoryId === '' ? <Check className="h-6 w-6 text-emerald-500" /> : null}
            </button>

            {filteredCategories.length === 0 ? (
              <div className="px-4 py-8 text-base text-gray-500">{labels.noResults}</div>
            ) : (
              filteredCategories.map(category => {
                const isSelected = selectedCategoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    disabled={selecting}
                    onClick={() => onSelect(category.id)}
                    className={`flex w-full items-center justify-between px-4 py-5 text-left text-base font-semibold transition-colors ${
                      isSelected ? 'bg-[#ede8e1] text-[#073b32]' : 'text-[#073b32] hover:bg-gray-50'
                    }`}
                  >
                    <span>{category.name}</span>
                    {isSelected ? <Check className="h-6 w-6 text-emerald-500" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </DrawerShell>
  );
}
