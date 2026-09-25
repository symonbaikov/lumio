'use client';

import { SpendOverTimeFilterChipsRow } from '@/app/(main)/statements/components/spend-over-time/components/SpendOverTimeFilterChipsRow';
import type { useSpendOverTimeViewModel } from '@/app/(main)/statements/components/spend-over-time/hooks/useSpendOverTimeViewModel';
import type { SpendOverTimeFlowType } from '@/app/(main)/statements/components/spend-over-time.utils';
import { Search } from '@/app/components/icons';
import { Select } from '@/app/components/ui/select';

type Props = { vm: ReturnType<typeof useSpendOverTimeViewModel> };

export function SpendOverTimePageHeader({ vm }: Props): React.JSX.Element {
  const { labels } = vm;
  return (
    <div className="lumio-view-page__header">
      <div className="lumio-view-page__title-row">
        <div>
          <h1 className="lumio-view-page__title">{labels.title}</h1>
          <p className="lumio-view-page__subtitle">{labels.subtitle}</p>
        </div>
        <div className="lumio-view-page__period-tabs">
          <button
            type="button"
            className={`lumio-view-page__period-tab${vm.activeFlowType === 'expense' ? ' lumio-view-page__period-tab--active' : ''}`}
            onClick={() => vm.setActiveFlowType('expense' as SpendOverTimeFlowType)}
          >
            {labels.tabExpense}
          </button>
          <button
            type="button"
            className={`lumio-view-page__period-tab${vm.activeFlowType === 'income' ? ' lumio-view-page__period-tab--active' : ''}`}
            onClick={() => vm.setActiveFlowType('income' as SpendOverTimeFlowType)}
          >
            {labels.tabIncome}
          </button>
        </div>
      </div>
      <div className="lumio-view-page__search-filter-row">
        <div className="lumio-view-page__search">
          <Search size={16} className="lumio-view-page__search-icon" />
          <input
            type="text"
            value={vm.searchInput}
            onChange={e => vm.setSearchInput(e.target.value)}
            placeholder={labels.searchPlaceholder}
            aria-label={labels.searchPlaceholder}
            className="lumio-view-page__search-input"
          />
        </div>
        <div>
          <label htmlFor="spend-over-time-workspace-filter" className="sr-only">
            {labels.workspace}
          </label>
          <Select
            id="spend-over-time-workspace-filter"
            value={vm.workspaceFilter}
            onChange={vm.setWorkspaceFilter}
            options={[
              { value: 'current', label: labels.currentWorkspace },
              { value: 'all', label: labels.allWorkspaces },
              ...vm.workspaces.map(ws => ({ value: ws.id, label: ws.name })),
            ]}
            sx={{ width: { xs: '100%', sm: 240 } }}
          />
        </div>
      </div>
      <SpendOverTimeFilterChipsRow vm={vm} />
    </div>
  );
}
