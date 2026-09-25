'use client';

import type { useTopCategoriesViewModel } from '@/app/(main)/statements/components/top-categories/hooks/useTopCategoriesViewModel';
import { Search } from '@/app/components/icons';
import { Select } from '@/app/components/ui/select';

type Props = { vm: ReturnType<typeof useTopCategoriesViewModel> };

export function TopCategoriesSearchRow({ vm }: Props): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <Search
          style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 16,
            height: 16,
            color: 'var(--muted-foreground)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          value={vm.searchInput}
          onChange={e => vm.setSearchInput(e.target.value)}
          placeholder={vm.labels.searchPlaceholder}
          aria-label={vm.labels.searchPlaceholder}
          className="lumio-view-page__search-input"
        />
      </div>
      <div style={{ width: 240 }}>
        <label
          htmlFor="top-categories-workspace-filter"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            whiteSpace: 'nowrap',
          }}
        >
          {vm.labels.workspace}
        </label>
        <Select
          fullWidth
          id="top-categories-workspace-filter"
          value={vm.workspaceFilter}
          onChange={vm.setWorkspaceFilter}
          options={[
            { value: 'current', label: vm.labels.currentWorkspace },
            { value: 'all', label: vm.labels.allWorkspaces },
            ...vm.workspaces.map(ws => ({ value: ws.id, label: ws.name ?? ws.id })),
          ]}
        />
      </div>
    </div>
  );
}
