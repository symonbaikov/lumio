'use client';

import {
  ChevronRight,
  Ellipsis,
  RefreshCcw,
  Table as TableIcon,
  Trash2,
} from '@/app/components/icons';
import { Tag as CategoryIcon } from '@/app/components/icons';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';
import { formatUpdatedDate } from '../customTablesHelpers';

export interface CustomTableRegistryItem {
  id: string;
  name: string;
  displayName: string;
  purpose: string;
  sourceSummary: string;
  sourceDescriptor: string;
  createdFromBadge: string | null;
  rowsCountLabel: string;
  updatedLabel: string;
  updatedAt: string;
  description: string | null;
  source: string;
  category?: { icon?: string | null } | null;
}

export interface TableListRowLabels {
  openLabel: string;
  exportLabel: string;
  exportCsvLabel: string;
  exportXlsxLabel: string;
  updateDataLabel: string;
  deleteLabel: string;
  fromLabel: string;
  columnLabels: { rows: string; updatedAt: string };
}

type TableActionsProps = {
  table: CustomTableRegistryItem;
  exportingTableId: string | null;
  updatingTableId: string | null;
  labels: TableListRowLabels;
  onExportTable: (table: CustomTableRegistryItem, format: 'csv' | 'xlsx') => void;
  onUpdateData: (table: CustomTableRegistryItem) => void;
  onConfirmDelete: (table: CustomTableRegistryItem) => void;
  onNavigate: (id: string) => void;
};
function TableActions({
  table,
  exportingTableId,
  updatingTableId,
  labels,
  onExportTable,
  onUpdateData,
  onConfirmDelete,
  onNavigate,
}: TableActionsProps): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1,
        width: { md: 360 },
        flexShrink: { md: 0 },
      }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Box
            component="button"
            type="button"
            disabled={exportingTableId === table.id}
            onClick={e => e.stopPropagation()}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              bgcolor: 'var(--primary-fill)',
              color: '#fff',
              px: 1.5,
              py: 0.75,
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'primary.dark' },
              '&:disabled': { opacity: 0.5 },
            }}
          >
            {labels.exportLabel}
          </Box>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation();
              onExportTable(table, 'csv');
            }}
          >
            {labels.exportCsvLabel}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation();
              onExportTable(table, 'xlsx');
            }}
          >
            {labels.exportXlsxLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Box
        component="button"
        type="button"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          border: '1px solid var(--border-color)',
          px: 1.5,
          py: 0.75,
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--foreground)',
          bgcolor: 'transparent',
          cursor: 'pointer',
          '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
        }}
        onClick={e => {
          e.stopPropagation();
          onNavigate(table.id);
        }}
      >
        {labels.openLabel}
      </Box>
      <Box
        component="button"
        type="button"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.5,
          py: 0.75,
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--muted-foreground)',
          bgcolor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          '&:hover': { color: 'var(--foreground)' },
          '&:disabled': { opacity: 0.5 },
        }}
        disabled={updatingTableId === table.id}
        onClick={e => {
          e.stopPropagation();
          onUpdateData(table);
        }}
      >
        <RefreshCcw className="h-3.5 w-3.5" />
        {labels.updateDataLabel}
      </Box>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Box
            component="button"
            type="button"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-color)',
              p: 0.75,
              color: 'var(--text-secondary)',
              bgcolor: 'transparent',
              cursor: 'pointer',
              '&:hover': { borderColor: 'var(--border-color)', color: 'var(--foreground)' },
            }}
            onClick={e => e.stopPropagation()}
            aria-label="More actions"
          >
            <Ellipsis className="h-4 w-4" />
          </Box>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation();
              onConfirmDelete(table);
            }}
            style={{ color: 'var(--destructive)' }}
          >
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <Trash2 className="h-4 w-4" />
              {labels.deleteLabel}
            </Box>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <ChevronRight className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
      </Box>
    </Box>
  );
}

type TableNameCellProps = { table: CustomTableRegistryItem; labels: TableListRowLabels };
function TableNameCell({ table, labels }: TableNameCellProps): React.JSX.Element {
  return (
    <Box sx={{ minWidth: 260, flex: 1 }}>
      <Typography
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--foreground)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {table.displayName}
      </Typography>
      <Typography
        style={{
          marginTop: 4,
          fontSize: 12,
          color: 'var(--muted-foreground)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {labels.fromLabel}: {table.sourceDescriptor} · {labels.columnLabels.rows}:{' '}
        {table.rowsCountLabel} · {labels.columnLabels.updatedAt}:{' '}
        {formatUpdatedDate(table.updatedAt)}
      </Typography>
      {table.createdFromBadge ? (
        <Box
          sx={{
            mt: 0.5,
            display: 'inline-flex',
            alignItems: 'center',
            border: '1px solid rgba(22,129,24,0.2)',
            bgcolor: 'rgba(22,129,24,0.1)',
            px: 1,
            py: 0.25,
            fontSize: 11,
            fontWeight: 500,
            color: 'primary.main',
          }}
        >
          {table.createdFromBadge}
        </Box>
      ) : table.description ? (
        <Typography
          style={{
            fontSize: 12,
            color: 'var(--muted-foreground)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {table.description}
        </Typography>
      ) : null}
    </Box>
  );
}

type TableListRowProps = {
  table: CustomTableRegistryItem;
  exportingTableId: string | null;
  updatingTableId: string | null;
  labels: TableListRowLabels;
  onExportTable: (table: CustomTableRegistryItem, format: 'csv' | 'xlsx') => void;
  onUpdateData: (table: CustomTableRegistryItem) => void;
  onConfirmDelete: (table: CustomTableRegistryItem) => void;
  onNavigate: (id: string) => void;
};
export function TableListRow({
  table,
  exportingTableId,
  updatingTableId,
  labels,
  onExportTable,
  onUpdateData,
  onConfirmDelete,
  onNavigate,
}: TableListRowProps): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        cursor: 'pointer',
        alignItems: 'center',
        gap: 1.5,
        border: '1px solid var(--border-color)',
        bgcolor: 'background.paper',
        px: 2,
        py: 1.5,
        '&:hover': { bgcolor: 'action.hover' },
      }}
      onClick={() => onNavigate(table.id)}
      onKeyDown={e => {
        if (e.target !== e.currentTarget) {
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate(table.id);
        }
      }}
    >
      <Checkbox
        aria-label={table.name}
        onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}
        className="h-4 w-4"
        style={{ flexShrink: 0 }}
      />
      <Box
        component="button"
        type="button"
        sx={{
          width: 44,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          bgcolor: 'transparent',
          border: 'none',
          '&:hover': { opacity: 0.8 },
        }}
        onClick={e => {
          e.stopPropagation();
          onNavigate(table.id);
        }}
        title={labels.openLabel}
      >
        {table.category?.icon ? (
          <CategoryIcon size={20} style={{ color: 'var(--foreground)' }} />
        ) : (
          <TableIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
        )}
      </Box>
      <Box sx={{ width: 12, flexShrink: 0 }} />
      <TableNameCell table={table} labels={labels} />
      <Box
        sx={{
          display: { xs: 'none', md: 'inline-block' },
          width: 176,
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--foreground)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {table.purpose}
      </Box>
      <Box
        sx={{
          display: { xs: 'none', md: 'inline-block' },
          width: 160,
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--muted-foreground)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {table.sourceSummary}
      </Box>
      <Box
        sx={{
          display: { xs: 'none', md: 'inline-block' },
          width: 96,
          flexShrink: 0,
          textAlign: 'right',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--foreground)',
        }}
      >
        {table.rowsCountLabel}
      </Box>
      <Box
        sx={{
          display: { xs: 'none', md: 'inline-block' },
          width: 112,
          flexShrink: 0,
          textAlign: 'right',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--foreground)',
        }}
      >
        {table.updatedLabel}
      </Box>
      <TableActions
        table={table}
        exportingTableId={exportingTableId}
        updatingTableId={updatingTableId}
        labels={labels}
        onExportTable={onExportTable}
        onUpdateData={onUpdateData}
        onConfirmDelete={onConfirmDelete}
        onNavigate={onNavigate}
      />
    </Box>
  );
}
