import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpendOverTimeDrillDown } from './SpendOverTimeDrillDown';

vi.mock('@/app/(main)/statements/components/analytics/AnalyticsSourceBadge', () => ({
  AnalyticsSourceBadge: () => <span>source-badge</span>,
}));

function renderDrillDown(onClose = vi.fn()) {
  render(
    <SpendOverTimeDrillDown
      selectedPoint={{
        period: '2026-08-24',
        label: '2026-08-24',
        income: 4850,
        expense: 0,
        net: 4850,
        count: 1,
        statementAmount: 4850,
        gmailAmount: 0,
      }}
      drillDownRecords={[]}
      groupBy="day"
      onClose={onClose}
      currency="EUR"
      sourceLabels={{
        sourceBank: 'Bank',
        sourceReceipt: 'Receipt',
        sourceGmailInbox: 'Gmail',
        sourceCrypto: 'Crypto',
      }}
      labels={{
        drillDown: 'Drill-down',
        close: 'Close',
        noOperations: 'No operations',
        lastOperation: 'Last operation',
        source: 'Source',
        workspace: 'Workspace',
        amount: 'Amount',
      }}
    />,
  );
  return { onClose, dialog: screen.getByRole('dialog', { name: '2026-08-24 - Drill-down' }) };
}

describe('SpendOverTimeDrillDown', () => {
  it('renders above the page in a portal and keeps focus inside', () => {
    const { dialog } = renderDrillDown();

    expect(dialog.closest('.MuiModal-root')?.parentElement).toBe(document.body);
    expect(dialog.parentElement?.contains(document.activeElement)).toBe(true);
  });

  it('closes on Escape', () => {
    const { dialog, onClose } = renderDrillDown();

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a click in the dimmed area but not inside the dialog', () => {
    const { dialog, onClose } = renderDrillDown();

    fireEvent.click(screen.getByText('No operations'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
