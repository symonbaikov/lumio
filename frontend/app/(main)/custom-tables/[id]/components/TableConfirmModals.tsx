'use client';

import ConfirmModal from '@/app/components/ConfirmModal';
import type { PastePreviewData } from '../utils/pasteUtils';
import type { CustomTableColumn, CustomTableGridRow } from '../utils/stylingUtils';
import { tx } from '../utils/tableHelpers';
import type { CustomTablePageColumn } from '../utils/tableTypes';
import { PastePreviewModal } from './PastePreviewModal';
import { RowDrawer } from './RowDrawer';
import type { PasteCellChangeFn, SaveRowFn } from './TableConfirmModals.types';

export interface TableConfirmModalsProps {
  t: unknown;
  pastePreviewOpen: boolean;
  pasteApplying: boolean;
  pasteParsing: boolean;
  pastePreview: PastePreviewData | null;
  pasteUseHeaders: boolean;
  hasMissingPasteColumnTitles: boolean;
  resetPastePreview: () => void;
  handlePasteHeadersToggle: (checked: boolean) => void;
  handlePasteCellChange: PasteCellChangeFn;
  handlePasteAdd: () => Promise<void>;
  rowDrawerOpen: boolean;
  rowDrawerMode: 'view' | 'edit';
  drawerRow: CustomTableGridRow | null;
  orderedColumns: CustomTablePageColumn[];
  closeRowDrawer: () => void;
  setRowDrawerMode: (mode: 'view' | 'edit') => void;
  saveRowFromDrawer: SaveRowFn;
  saveRowAndCloseDrawer: SaveRowFn;
  saveRowAndNext: SaveRowFn;
  deleteColumnModalOpen: boolean;
  deleteColumnTarget: CustomTableColumn | null;
  closeDeleteColumnModal: () => void;
  deleteColumn: () => void | Promise<void>;
  bulkDeleteModalOpen: boolean;
  bulkDeleteRowIds: string[];
  selectedRowIds: string[];
  closeBulkDeleteModal: () => void;
  deleteSelectedRows: () => void;
  deleteRowModalOpen: boolean;
  deleteRowTarget: { rowNumber?: number } | null;
  closeDeleteRowModal: () => void;
  deleteRow: () => void;
}

type P = TableConfirmModalsProps;

function PasteModalSection(p: P): React.JSX.Element {
  return (
    <PastePreviewModal
      t={p.t}
      isOpen={p.pastePreviewOpen}
      onClose={p.resetPastePreview}
      pasteApplying={p.pasteApplying}
      pasteParsing={p.pasteParsing}
      pastePreview={p.pastePreview}
      pasteUseHeaders={p.pasteUseHeaders}
      hasMissingPasteColumnTitles={p.hasMissingPasteColumnTitles}
      onHeadersToggle={p.handlePasteHeadersToggle}
      onCellChange={p.handlePasteCellChange}
      onConfirm={p.handlePasteAdd}
    />
  );
}

function RowDrawerSection(p: P): React.JSX.Element {
  return (
    <RowDrawer
      open={p.rowDrawerOpen}
      mode={p.rowDrawerMode}
      row={p.drawerRow}
      columns={p.orderedColumns}
      onClose={p.closeRowDrawer}
      onModeChange={p.setRowDrawerMode}
      onSave={p.saveRowFromDrawer}
      onSaveAndClose={p.saveRowAndCloseDrawer}
      onSaveAndNext={p.saveRowAndNext}
    />
  );
}

function DeleteColumnConfirm(p: P): React.JSX.Element {
  const msg = p.deleteColumnTarget
    ? `${tx(p.t, ['deleteColumn', 'confirmWithNamePrefix'], '')}${p.deleteColumnTarget.title}${tx(p.t, ['deleteColumn', 'confirmWithNameSuffix'], '')}`
    : tx(p.t, ['deleteColumn', 'confirmNoName'], 'Delete this column?');
  return (
    <ConfirmModal
      isOpen={p.deleteColumnModalOpen}
      onClose={p.closeDeleteColumnModal}
      onConfirm={p.deleteColumn}
      title={tx(p.t, ['deleteColumn', 'confirmTitle'], 'Delete column')}
      message={msg}
      confirmText={tx(p.t, ['deleteColumn', 'confirm'], 'Delete')}
      cancelText={tx(p.t, ['deleteColumn', 'cancel'], 'Cancel')}
      isDestructive
    />
  );
}

function BulkDeleteConfirm(p: P): React.JSX.Element {
  const count = (p.bulkDeleteRowIds.length || p.selectedRowIds.length).toString();
  const msg = `${tx(p.t, ['bulkDeleteRows', 'confirmMessagePrefix'], '')}${count}${tx(p.t, ['bulkDeleteRows', 'confirmMessageSuffix'], '')}`;
  return (
    <ConfirmModal
      isOpen={p.bulkDeleteModalOpen}
      onClose={p.closeBulkDeleteModal}
      onConfirm={p.deleteSelectedRows}
      title={tx(p.t, ['bulkDeleteRows', 'confirmTitle'], 'Delete selected rows')}
      message={msg}
      confirmText={tx(p.t, ['bulkDeleteRows', 'confirm'], 'Delete')}
      cancelText={tx(p.t, ['bulkDeleteRows', 'cancel'], 'Cancel')}
      isDestructive
    />
  );
}

function DeleteRowConfirm(p: P): React.JSX.Element {
  const msg = p.deleteRowTarget
    ? `${tx(p.t, ['deleteRow', 'confirmWithNumberPrefix'], '')}${p.deleteRowTarget?.rowNumber ?? ''}${tx(p.t, ['deleteRow', 'confirmWithNumberSuffix'], '')}`
    : tx(p.t, ['deleteRow', 'confirmNoNumber'], 'Delete this row?');
  return (
    <ConfirmModal
      isOpen={p.deleteRowModalOpen}
      onClose={p.closeDeleteRowModal}
      onConfirm={p.deleteRow}
      title={tx(p.t, ['deleteRow', 'confirmTitle'], 'Delete row')}
      message={msg}
      confirmText={tx(p.t, ['deleteRow', 'confirm'], 'Delete')}
      cancelText={tx(p.t, ['deleteRow', 'cancel'], 'Cancel')}
      isLoading={false}
      isDestructive
    />
  );
}

export function TableConfirmModals(p: TableConfirmModalsProps): React.JSX.Element {
  return (
    <>
      <PasteModalSection {...p} />
      <RowDrawerSection {...p} />
      <DeleteColumnConfirm {...p} />
      <BulkDeleteConfirm {...p} />
      <DeleteRowConfirm {...p} />
    </>
  );
}
