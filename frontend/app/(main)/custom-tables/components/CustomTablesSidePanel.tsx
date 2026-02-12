'use client';

import { type SidePanelPageConfig, useSidePanelConfig } from '@/app/components/side-panel';
import {
  type CustomTableSortOrder,
  type CustomTableSourceFilter,
  dispatchCustomTableAction,
  dispatchCustomTableViewEvent,
} from '@/app/lib/custom-table-actions';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  FileSpreadsheet,
  Pencil,
  Table as TableIcon,
} from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import { useMemo } from 'react';
import CustomTablesCircularMenu from './CustomTablesCircularMenu';

type Props = {
  activeSource: CustomTableSourceFilter;
  sortOrder: CustomTableSortOrder;
  sourceCounts: Record<CustomTableSourceFilter, number>;
};

const resolveLabel = (value: unknown, fallback: string): string =>
  (value as { value?: string })?.value ?? (value as string) ?? fallback;

export default function CustomTablesSidePanel({ activeSource, sortOrder, sourceCounts }: Props) {
  const t = useIntlayer('customTablesPage');
  const sidePanelT = (t as any).sidePanel ?? {};
  const allCount = sourceCounts.all;
  const manualCount = sourceCounts.manual;
  const googleSheetsCount = sourceCounts.google_sheets_import;
  const statementCount = sourceCounts.statement;

  const labels = useMemo(
    () => ({
      title: resolveLabel((t as any)?.header?.title, 'Custom tables'),
      subtitle: resolveLabel(sidePanelT.subtitle, 'Overview'),
      todoTitle: resolveLabel(sidePanelT.todoTitle, 'To-do'),
      accountingTitle: resolveLabel(sidePanelT.accountingTitle, 'Accounting'),
      insightsTitle: resolveLabel(sidePanelT.insightsTitle, 'Insights'),
      allTables: resolveLabel(sidePanelT.allTables, 'All tables'),
      manual: resolveLabel((t as any)?.sources?.manual, 'Manual'),
      googleSheets: resolveLabel((t as any)?.sources?.googleSheets, 'Google Sheets'),
      fromStatement: resolveLabel((t as any)?.filters?.fromStatement, 'From statement'),
      recentUpdates: resolveLabel((t as any)?.filters?.sortUpdated, 'Recent updates'),
      byName: resolveLabel((t as any)?.filters?.sortName, 'By name'),
      sourceOverview: resolveLabel(sidePanelT.sourceOverview, 'Sources overview'),
      noData: resolveLabel(sidePanelT.noData, 'No data'),
      createTable: resolveLabel((t as any)?.actions?.create, 'Create table'),
      openMenu: resolveLabel(sidePanelT.openMenu, 'Open table actions'),
    }),
    [
      sidePanelT.accountingTitle,
      sidePanelT.allTables,
      sidePanelT.insightsTitle,
      sidePanelT.noData,
      sidePanelT.openMenu,
      sidePanelT.sourceOverview,
      sidePanelT.subtitle,
      sidePanelT.todoTitle,
      t,
    ],
  );

  const sidePanelConfig = useMemo<SidePanelPageConfig>(
    () => ({
      pageId: 'custom-tables',
      header: {
        title: labels.title,
        subtitle: labels.subtitle,
      },
      sections: [
        {
          id: 'todo',
          type: 'navigation',
          title: labels.todoTitle,
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
      footer: {
        content: (
          <CustomTablesCircularMenu
            onCreateEmpty={() => dispatchCustomTableAction('create-empty')}
            onImportFromStatement={() => dispatchCustomTableAction('import-statement')}
            onImportGoogleSheets={() => dispatchCustomTableAction('import-google-sheets')}
            labels={{
              createTable: labels.createTable,
              fromStatement: labels.fromStatement,
              importGoogleSheets: labels.googleSheets,
              openMenu: labels.openMenu,
            }}
          />
        ),
      },
    }),
    [
      activeSource,
      allCount,
      googleSheetsCount,
      labels.accountingTitle,
      labels.allTables,
      labels.byName,
      labels.createTable,
      labels.fromStatement,
      labels.googleSheets,
      labels.insightsTitle,
      labels.manual,
      labels.noData,
      labels.openMenu,
      labels.recentUpdates,
      labels.sourceOverview,
      labels.subtitle,
      labels.title,
      labels.todoTitle,
      manualCount,
      sortOrder,
      statementCount,
    ],
  );

  useSidePanelConfig({ config: sidePanelConfig, autoRegister: true });

  return null;
}
