'use client';

import { tokens } from '@/lib/theme-tokens';
import React from 'react';

interface UnapprovedCashBulkActionsProps {
  selectedCount: number;
  labels: {
    actions: Record<string, string>;
  };
  // eslint-disable-next-line max-params
  formatTemplate: (template: string, values: Record<string, string | number>) => string;
  onToggleSelectAllVisible: () => void;
  onIgnoreSelected: () => void;
  onClearSelection: () => void;
}

export function UnapprovedCashBulkActions({
  selectedCount,
  labels,
  formatTemplate,
  onToggleSelectAllVisible,
  onIgnoreSelected,
  onClearSelection,
}: UnapprovedCashBulkActionsProps): React.ReactElement | null {
  if (selectedCount === 0) {
    return null;
  }
  const { actions } = labels;
  const selectedLabel = formatTemplate(actions.selected, { count: selectedCount });
  return (
    <div
      style={{
        border: '1px solid rgba(var(--primary-rgb,0,0,0),0.3)',
        background: 'rgba(var(--primary-rgb,0,0,0),0.05)',
        padding: 12,
        borderRadius: tokens.radius.lg,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--primary-fill)',
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 600,
            color: '#fff',
            borderRadius: tokens.radius.full,
          }}
        >
          {selectedLabel}
        </span>
        <button
          type="button"
          onClick={onToggleSelectAllVisible}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            border: '1px solid rgba(var(--primary-rgb,0,0,0),0.3)',
            background: 'var(--card-bg)',
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--primary)',
            cursor: 'pointer',
            borderRadius: tokens.radius.md,
          }}
        >
          {actions.selectAllVisible}
        </button>
        <button
          type="button"
          onClick={onIgnoreSelected}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--foreground)',
            cursor: 'pointer',
            borderRadius: tokens.radius.md,
          }}
        >
          {actions.ignore}
        </button>
        <button
          type="button"
          onClick={onClearSelection}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            marginLeft: 'auto',
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--foreground)',
            cursor: 'pointer',
            borderRadius: tokens.radius.md,
          }}
        >
          {actions.clearSelection}
        </button>
      </div>
    </div>
  );
}
