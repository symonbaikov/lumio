'use client';

import { SpendOverTimeFilterChipsRow } from '@/app/(main)/statements/components/spend-over-time/components/SpendOverTimeFilterChipsRow';
import type { useSpendOverTimeViewModel } from '@/app/(main)/statements/components/spend-over-time/hooks/useSpendOverTimeViewModel';
import type { SpendOverTimeFlowType } from '@/app/(main)/statements/components/spend-over-time.utils';
import { Search } from '@/app/components/icons';

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
          <select
            id="spend-over-time-workspace-filter"
            value={vm.workspaceFilter}
            onChange={e => vm.setWorkspaceFilter(e.target.value)}
            className="lumio-view-page__workspace-filter"
          >
            <option value="current">{labels.currentWorkspace}</option>
            <option value="all">{labels.allWorkspaces}</option>
            {vm.workspaces.map(ws => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <SpendOverTimeFilterChipsRow vm={vm} />
    </div>
  );
}
