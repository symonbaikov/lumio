'use client';

import { useState } from 'react';

import { AuditEventDrawer } from '@/app/audit/components/AuditEventDrawer';
import { useIntlayer } from '@/app/i18n';

import { DrawerShell } from '../ui/drawer-shell';
import { TransactionDetailsTab } from './TransactionDetailsTab';
import { TransactionHistoryTab } from './TransactionHistoryTab';
import { useTransactionHistory } from './hooks/useTransactionHistory';
import type { Category, Transaction } from './types';

interface DetailsDrawerProps {
  open: boolean;
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onUpdateCategory?: (txId: string, categoryId: string) => Promise<void>;
  onMarkIgnored?: (txId: string) => Promise<void>;
  onSplitDone?: () => void | Promise<void>;
}

/**
 * Drawer component for displaying full transaction details and actions.
 * Composes TransactionDetailsTab + TransactionHistoryTab behind a tab switcher.
 */
export default function DetailsDrawer({
  open,
  transaction,
  categories,
  onClose,
  onUpdateCategory,
  onMarkIgnored,
  onSplitDone,
}: DetailsDrawerProps) {
  const t = useIntlayer('transactionsDrawer');
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const {
    historyEvents,
    historyLoading,
    historyDrawerOpen,
    selectedHistoryEvent,
    openEventDrawer,
    closeEventDrawer,
  } = useTransactionHistory(open, transaction?.id);

  if (!transaction) return null;

  return (
    <DrawerShell
      isOpen={open}
      onClose={onClose}
      title={t.title.value}
      position="right"
      width="md"
      lockScroll={false}
    >
      <div className="lumio-tx-drawer">
        <div className="lumio-tx-drawer__tabs">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`lumio-tx-drawer__tab${activeTab === 'details' ? ' lumio-tx-drawer__tab--active' : ''}`}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`lumio-tx-drawer__tab${activeTab === 'history' ? ' lumio-tx-drawer__tab--active' : ''}`}
          >
            History
          </button>
        </div>

        {activeTab === 'details' ? (
          <TransactionDetailsTab
            transaction={transaction}
            categories={categories}
            onUpdateCategory={onUpdateCategory}
            onMarkIgnored={onMarkIgnored}
            onSplitDone={onSplitDone}
          />
        ) : (
          <TransactionHistoryTab
            events={historyEvents}
            loading={historyLoading}
            onSelect={openEventDrawer}
          />
        )}
      </div>

      <AuditEventDrawer
        event={selectedHistoryEvent}
        open={historyDrawerOpen}
        onClose={closeEventDrawer}
      />
    </DrawerShell>
  );
}
