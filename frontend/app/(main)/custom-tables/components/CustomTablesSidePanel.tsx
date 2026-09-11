'use client';

import { useMemo } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  FileSpreadsheet,
  Pencil,
  Table as TableIcon,
} from '@/app/components/icons';
import { type SidePanelPageConfig, useSidePanelConfig } from '@/app/components/side-panel';
import { useIntlayer } from '@/app/i18n';
import {
  type CustomTableSortOrder,
  type CustomTableSourceFilter,
  dispatchCustomTableViewEvent,
} from '@/app/lib/custom-table-actions';
import { getNestedValue, getRecord, resolveLabel } from '@/app/lib/side-panel-utils';

type Props = {
  activeSource: CustomTableSourceFilter;
  sortOrder: CustomTableSortOrder;
  sourceCounts: Record<CustomTableSourceFilter, number>;
};

export default function CustomTablesSidePanel({ activeSource, sortOrder, sourceCounts }: Props) {
  const t = useIntlayer('customTablesPage');
  const sidePanelT = getRecord(getNestedValue(t, ['sidePanel'])) ?? {};
  const allCount = sourceCounts.all;
  const manualCount = sourceCounts.manual;
  const googleSheetsCount = sourceCounts.google_sheets_import;
  const statementCount = sourceCounts.statement;

  const labels = useMemo(
    () => ({
      accountingTitle: resolveLabel(sidePanelT.accountingTitle, 'Accounting'),
      insightsTitle: resolveLabel(sidePanelT.insightsTitle, 'Insights'),
      allTables: resolveLabel(sidePanelT.allTables, 'All tables'),
      manual: resolveLabel(getNestedValue(t, ['sources', 'manual']), 'Manual'),
      googleSheets: resolveLabel(getNestedValue(t, ['sources', 'googleSheets']), 'Google Sheets'),
      fromStatement: resolveLabel(
        getNestedValue(t, ['filters', 'fromStatement']),
        'From statement',
      ),
      recentUpdates: resolveLabel(getNestedValue(t, ['filters', 'sortUpdated']), 'Recent updates'),
      byName: resolveLabel(getNestedValue(t, ['filters', 'sortName']), 'By name'),
      sourceOverview: resolveLabel(sidePanelT.sourceOverview, 'Sources overview'),
      noData: resolveLabel(sidePanelT.noData, 'No data'),
    }),
    [
      sidePanelT.accountingTitle,
      sidePanelT.allTables,
      sidePanelT.insightsTitle,
      sidePanelT.noData,
      sidePanelT.sourceOverview,
      t,
    ],
  );

  const sidePanelConfig = useMemo<SidePanelPageConfig>(
    () => ({
      pageId: 'custom-tables',
      sections: [
        {
          id: 'todo',
          type: 'navigation',
          items: [
            {
              id: 'all',
              label: labels.allTables,
              icon: TableIcon,
              badge: allCount,
              active: activeSource === 'all',
              onClick: () => dispatchCustomTableViewEvent({ type: 'filter-source', value: 'all' }),
            },
            {
              id: 'manual',
              label: labels.manual,
              icon: Pencil,
              badge: manualCount,
              active: activeSource === 'manual',
              onClick: () =>
                dispatchCustomTableViewEvent({ type: 'filter-source', value: 'manual' }),
            },
            {
              id: 'google-sheets',
              label: labels.googleSheets,
              icon: FileSpreadsheet,
              badge: googleSheetsCount,
              active: activeSource === 'google_sheets_import',
              onClick: () =>
                dispatchCustomTableViewEvent({
                  type: 'filter-source',
                  value: 'google_sheets_import',
                }),
            },
            {
              id: 'from-statement',
              label: labels.fromStatement,
              icon: FileSpreadsheet,
              badge: statementCount,
              active: activeSource === 'statement',
              onClick: () =>
                dispatchCustomTableViewEvent({ type: 'filter-source', value: 'statement' }),
            },
          ],
        },
        {
          id: 'accounting',
          type: 'navigation',
          title: labels.accountingTitle,
          items: [
            {
              id: 'recent-updates',
              label: labels.recentUpdates,
              icon: ArrowDown,
              active: sortOrder === 'updated_desc',
              onClick: () =>
                dispatchCustomTableViewEvent({ type: 'sort-order', value: 'updated_desc' }),
            },
            {
              id: 'by-name',
              label: labels.byName,
              icon: ArrowUp,
              active: sortOrder === 'name_asc',
              onClick: () =>
                dispatchCustomTableViewEvent({ type: 'sort-order', value: 'name_asc' }),
            },
          ],
        },
        {
          id: 'insights',
          type: 'navigation',
          title: labels.insightsTitle,
          items: [
            {
              id: 'sources-overview',
              label: labels.sourceOverview,
              icon: BarChart3,
              badge: allCount,
              children:
                allCount > 0
                  ? [
                      {
                        id: 'overview-manual',
                        label: labels.manual,
                        badge: manualCount,
                        badgeVariant: 'primary',
                        disabled: true,
                      },
                      {
                        id: 'overview-google-sheets',
                        label: labels.googleSheets,
                        badge: googleSheetsCount,
                        badgeVariant: 'primary',
                        disabled: true,
                      },
                      {
                        id: 'overview-statement',
                        label: labels.fromStatement,
                        badge: statementCount,
                        badgeVariant: 'primary',
                        disabled: true,
                      },
                    ]
                  : [
                      {
                        id: 'overview-empty',
                        label: labels.noData,
                        disabled: true,
                      },
                    ],
            },
          ],
        },
      ],
    }),
    [
      activeSource,
      allCount,
      googleSheetsCount,
      labels.accountingTitle,
      labels.allTables,
      labels.byName,
      labels.fromStatement,
      labels.googleSheets,
      labels.insightsTitle,
      labels.manual,
      labels.noData,
      labels.recentUpdates,
      labels.sourceOverview,
      manualCount,
      sortOrder,
      statementCount,
    ],
  );

  useSidePanelConfig({ config: sidePanelConfig, autoRegister: true });

  return null;
}
