'use client';

import type React from 'react';

import { UnapprovedCashBulkActions } from '@/app/(main)/statements/components/unapproved-cash/components/UnapprovedCashBulkActions';
import { UnapprovedCashContent } from '@/app/(main)/statements/components/unapproved-cash/components/UnapprovedCashContent';
import { UnapprovedCashFilterBar } from '@/app/(main)/statements/components/unapproved-cash/components/UnapprovedCashFilterBar';
import { UnapprovedCashPageHeader } from '@/app/(main)/statements/components/unapproved-cash/components/UnapprovedCashPageHeader';
import { UnapprovedCashStatCards } from '@/app/(main)/statements/components/unapproved-cash/components/UnapprovedCashStatCards';
import {
  type UnapprovedCashViewModel,
  useUnapprovedCashViewModel,
} from '@/app/(main)/statements/components/unapproved-cash/hooks/useUnapprovedCashViewModel';
import { tokens } from '@/lib/theme-tokens';

const CONTAINER_STYLE: React.CSSProperties = {
  display: 'flex',
  // The parent layout wrapper already caps height to 100vh - nav on
  // /statements/* routes; recomputing it here made this box taller than the
  // parent whenever a sibling (e.g. AlertBanner) also took up space.
  height: '100%',
  minHeight: 0,
  flexDirection: 'column',
  overflow: 'hidden',
  padding: '24px 16px',
};

type VmProps = { vm: UnapprovedCashViewModel };

function UnapprovedCashControls({ vm }: VmProps): React.JSX.Element {
  const { labels, reasonOptions, sourceOptions } = vm;
  return (
    <div
      style={{ marginBottom: 16, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <UnapprovedCashPageHeader
        title={labels.title}
        subtitle={labels.subtitle}
        refreshLabel={labels.actions.refresh}
        loading={vm.loading}
        refreshing={vm.refreshing}
        onRefresh={() => void vm.loadQueueData(true)}
      />
      <UnapprovedCashStatCards
        totalCount={vm.queueWithoutIgnored.length}
        reasonCounts={vm.reasonCounts}
        labels={{
          total: labels.summary.total,
          missingCategory: labels.summary.missingCategory,
          duplicates: labels.summary.duplicates,
          confirmation: labels.summary.confirmation,
        }}
      />
      <UnapprovedCashFilterBar
        filters={vm.filters}
        reasonOptions={reasonOptions}
        sourceOptions={sourceOptions}
        labels={{ searchPlaceholder: labels.searchPlaceholder, filters: labels.filters }}
        setFilters={vm.setFilters}
        resetFilters={vm.resetFilters}
      />
      <UnapprovedCashBulkActions
        selectedCount={vm.selectedCount}
        labels={{ actions: labels.actions }}
        formatTemplate={vm.formatTemplate}
        onToggleSelectAllVisible={vm.toggleSelectAllVisible}
        onIgnoreSelected={vm.handleIgnoreSelected}
        onClearSelection={() => vm.setSelectedIds(() => [])}
      />
    </div>
  );
}

export default function UnapprovedCashView(): React.JSX.Element {
  const vm = useUnapprovedCashViewModel();
  return (
    <div className="container-shared" style={CONTAINER_STYLE}>
      <UnapprovedCashControls vm={vm} />
      <div
        style={{
          minHeight: 0,
          flex: 1,
          overflowY: 'auto',
          border: '1px solid var(--border-color)',
          background: 'var(--card-bg)',
          borderRadius: tokens.radius.lg,
        }}
      >
        <UnapprovedCashContent
          loading={vm.loading}
          filteredQueue={vm.filteredQueue}
          selectedIds={vm.selectedIds}
          allVisibleSelected={vm.allVisibleSelected}
          reasonLabelById={vm.reasonLabelById}
          sourceLabelById={vm.sourceLabelById}
          labels={{
            empty: { title: vm.labels.empty.title, description: vm.labels.empty.description },
            table: vm.labels.table,
            actions: { reviewFix: vm.labels.actions.reviewFix },
          }}
          onToggleSelectAllVisible={vm.toggleSelectAllVisible}
          onToggleSelect={vm.toggleSelect}
          onReview={vm.handleReview}
          formatAmount={vm.formatItemAmount}
          formatDate={vm.formatItemDate}
        />
      </div>
    </div>
  );
}
