'use client';

import type { ComponentProps } from 'react';
import StatementsSidePanel from '../components/StatementsSidePanel';
import TablesReportsView from '../components/TablesReportsView';

export default function StatementsTablesReportsPage() {
  return (
    <>
      <StatementsSidePanel
        activeItem={'tables-reports' as ComponentProps<typeof StatementsSidePanel>['activeItem']}
      />
      <TablesReportsView />
    </>
  );
}
