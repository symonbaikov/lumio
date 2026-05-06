'use client';

import { Box } from '@mui/material';
import { ArrowLeft as ArrowBackIcon, CheckCircle, Printer, Search, Trash2, XCircle } from '@/app/components/icons';
import type React from 'react';
import type { QuickTab } from '../utils/quickTabs';
import type { ColumnType } from '../utils/stylingUtils';
import { tx } from '../utils/tableHelpers';
import type { CustomTablePageColumn } from '../utils/tableTypes';
import { AddColumnModal } from './AddColumnModal';
import { ColumnsVisibilityPanel } from './ColumnsVisibilityPanel';

interface ColumnTypeOption { value: ColumnType; label: string; }

export interface TableToolbarProps {
  t: unknown;
  isFullscreen: boolean; isPrintMode: boolean;
  quickTabs: QuickTab[]; normalizedActiveTabId: string; columnsTabId: string;
  setActiveTabId: (id: string) => void; handleBackNavigation: () => void;
  selectedRowIds: string[]; bulkMarking: string | null;
  markSelectedRowsPaid: (paid: boolean) => void | Promise<void>;
  handlePrintTable: () => void; openBulkDeleteModal: (ids: string[]) => void;
  searchQuery: string; setSearchQuery: (q: string) => void;
  columnOrder: string[]; orderedColumns: CustomTablePageColumn[];
  hiddenColumnKeys: string[]; isColumnsDefault: boolean;
  toggleColumnHidden: (key: string) => void; resetColumns: () => void;
  newColumnOpen: boolean; setNewColumnOpen: React.Dispatch<React.SetStateAction<boolean>>;
  newColumn: { title: string; type: ColumnType };
  setNewColumn: React.Dispatch<React.SetStateAction<{ title: string; type: ColumnType }>>;
  createColumn: () => Promise<void>; columnTypes: ColumnTypeOption[];
}

type P = TableToolbarProps;

const BTN_BASE_SX = { display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: { xs: 0.75, sm: 1 }, whiteSpace: 'nowrap', border: '1px solid var(--border-color)', px: { xs: 1.25, sm: 2 }, py: { xs: 0.5, sm: 0.75 }, fontSize: { xs: 11, sm: 12 }, fontWeight: 500, bgcolor: 'transparent', cursor: 'pointer', '&:disabled': { opacity: 0.5, cursor: 'not-allowed' } };

interface BulkMarkParams { selectedIds: string[]; bulkMarking: string | null; }
function canBulkMarkRows({ selectedIds, bulkMarking }: BulkMarkParams): boolean {
  return selectedIds.length > 0 && bulkMarking === null;
}

interface QuickTabButtonProps { tab: QuickTab; isActive: boolean; setActiveTabId: (id: string) => void; }
function QuickTabButton({ tab, isActive, setActiveTabId }: QuickTabButtonProps): React.JSX.Element {
  const color = isActive ? 'primary.main' : 'var(--muted-foreground)';
  const countBg = isActive ? 'rgba(22,129,24,0.1)' : 'var(--muted)';
  return (
    <Box component="button" onClick={() => { if (!isActive) setActiveTabId(tab.id); }} sx={{ position: 'relative', flexShrink: 0, whiteSpace: 'nowrap', pb: 1.5, fontSize: 14, fontWeight: 500, bgcolor: 'transparent', border: 'none', cursor: 'pointer', color, '&:hover': { color: isActive ? 'primary.main' : 'var(--foreground)' } }}>
      {tab.label}
      {typeof tab.count === 'number' && <Box component="span" sx={{ ml: 0.75, fontSize: 12, py: 0.25, px: 1, bgcolor: countBg, color }}>{tab.count}</Box>}
      {isActive && <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, bgcolor: 'primary.main' }} />}
    </Box>
  );
}

function TabsRow(p: P): React.JSX.Element {
  const colTabActive = p.normalizedActiveTabId === p.columnsTabId;
  return (
    <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.5, borderBottom: '1px solid var(--muted)', px: 1 }}>
      <Box component="button" type="button" onClick={p.handleBackNavigation} sx={{ display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: 0.75, pb: 1.5, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', bgcolor: 'transparent', border: 'none', cursor: 'pointer', '&:hover': { color: 'var(--foreground)' } }}>
        <ArrowBackIcon size={16} /><span>{tx(p.t, ['nav', 'back'], 'Back')}</span>
      </Box>
      <Box sx={{ display: 'flex', minWidth: 0, flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2.5, overflowX: 'auto' }}>
        {p.quickTabs.map(tab => <QuickTabButton key={tab.id} tab={tab} isActive={p.normalizedActiveTabId === tab.id} setActiveTabId={p.setActiveTabId} />)}
        <Box component="button" type="button" onClick={() => { if (colTabActive) return; p.setActiveTabId(p.columnsTabId); }} sx={{ position: 'relative', flexShrink: 0, whiteSpace: 'nowrap', pb: 1.5, fontSize: 14, fontWeight: 500, bgcolor: 'transparent', border: 'none', cursor: 'pointer', color: colTabActive ? 'primary.main' : 'var(--muted-foreground)', '&:hover': { color: colTabActive ? 'primary.main' : 'var(--foreground)' } }}>
          {tx(p.t, ['actions', 'columns'], 'Columns')}
          {colTabActive && <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, bgcolor: 'primary.main' }} />}
        </Box>
      </Box>
    </Box>
  );
}

interface SearchBoxProps { t: unknown; searchQuery: string; setSearchQuery: (q: string) => void; }
function SearchBox({ t, searchQuery, setSearchQuery }: SearchBoxProps): React.JSX.Element {
  return (
    <Box sx={{ position: 'relative' }}>
      <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--muted-foreground)' }} />
      <input placeholder={tx(t, ['actions', 'searchPlaceholder'], 'Search')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 36, paddingRight: 16, paddingTop: 8, paddingBottom: 8, fontSize: 14, width: 192, border: '1px solid var(--border-color)', background: 'var(--card-bg)' }} />
    </Box>
  );
}

function BulkActionsRow(p: P): React.JSX.Element {
  const can = canBulkMarkRows({ selectedIds: p.selectedRowIds, bulkMarking: p.bulkMarking });
  const paidColor = can ? '#22c55e' : 'rgba(34,197,94,0.5)';
  const unpaidColor = can ? '#ef4444' : 'rgba(239,68,68,0.5)';
  const btnColor = can ? '#4b5563' : 'var(--muted-foreground)';
  const markPaidLabel = p.bulkMarking === 'paid' ? tx(p.t, ['actions', 'markingPaid'], 'Marking paid') : tx(p.t, ['actions', 'markPaid'], 'Mark paid');
  const markUnpaidLabel = p.bulkMarking === 'unpaid' ? tx(p.t, ['actions', 'markingUnpaid'], 'Marking unpaid') : tx(p.t, ['actions', 'markUnpaid'], 'Mark unpaid');
  return (<Box sx={{ mt: 1.5, width: '100%', px: 1, pb: 1.5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, overflowX: 'auto' }}>
      <Box sx={{ display: 'flex', minWidth: 0, flexWrap: 'nowrap', alignItems: 'center', gap: { xs: 0.75, sm: 1 } }}>
        <Box component="button" type="button" onClick={() => p.markSelectedRowsPaid(true)} disabled={!can} sx={{ ...BTN_BASE_SX, color: btnColor, '&:hover': { bgcolor: 'var(--muted)' } }}>
          <CheckCircle style={{ width: 14, height: 14, color: paidColor }} /><span>{markPaidLabel}</span>
        </Box>
        <Box component="button" type="button" onClick={() => p.markSelectedRowsPaid(false)} disabled={!can} sx={{ ...BTN_BASE_SX, color: btnColor, '&:hover': { bgcolor: 'var(--muted)' } }}>
          <XCircle style={{ width: 14, height: 14, color: unpaidColor }} /><span>{markUnpaidLabel}</span>
        </Box>
        <Box component="button" onClick={p.handlePrintTable} sx={{ ...BTN_BASE_SX, color: 'var(--text-secondary)', '&:hover': { bgcolor: 'var(--muted)', color: 'var(--foreground)' } }}>
          <Printer className="h-3.5 w-3.5" /><span>{tx(p.t, ['actions', 'print'], 'Print')}</span>
        </Box>
        <Box component="button" onClick={() => p.openBulkDeleteModal(p.selectedRowIds)} disabled={p.selectedRowIds.length === 0} sx={{ ...BTN_BASE_SX, color: 'var(--text-secondary)', '&:hover': { borderColor: '#fecaca', bgcolor: 'var(--color-error-soft-bg)', color: 'var(--destructive)' } }}>
          <Trash2 className="h-3.5 w-3.5" /><span>{tx(p.t, ['actions', 'delete'], 'Delete')}</span>
        </Box>
      </Box>
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
        <SearchBox t={p.t} searchQuery={p.searchQuery} setSearchQuery={p.setSearchQuery} />
      </Box>
    </Box>
  </Box>);
}

export function TableToolbar(p: P): React.JSX.Element {
  const isColTab = p.normalizedActiveTabId === p.columnsTabId;
  const containerSx = p.isFullscreen ? { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, bgcolor: 'background.paper', px: { xs: 2, sm: 3 }, pt: 2.5, borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', borderTop: '1px solid var(--border-color)', ...(isColTab ? { bottom: 0, overflowY: 'auto', pb: 3 } : { pb: 0 }) } : { mb: 0, display: 'flex', flexDirection: 'column', gap: 0 };
  return (
    <Box sx={containerSx} className={p.isPrintMode ? 'custom-table-print-controls' : undefined}>
      <TabsRow {...p} />
      {!isColTab && <BulkActionsRow {...p} />}
      {isColTab && <ColumnsVisibilityPanel t={p.t} columnOrder={p.columnOrder} orderedColumns={p.orderedColumns} hiddenColumnKeys={p.hiddenColumnKeys} isColumnsDefault={p.isColumnsDefault} toggleColumnHidden={p.toggleColumnHidden} resetColumns={p.resetColumns} />}
      <AddColumnModal t={p.t} isOpen={p.newColumnOpen} onClose={() => p.setNewColumnOpen(false)} newColumn={p.newColumn} setNewColumn={p.setNewColumn} createColumn={p.createColumn} columnTypes={p.columnTypes} />
    </Box>
  );
}
