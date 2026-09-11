'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { CheckCircle2, Pencil, Trash2, TriangleAlert, XCircle } from '@/app/components/icons';
import { Checkbox } from '@/app/components/ui/checkbox';
import { getCategoryDisplayName } from '@/app/lib/statement-categories';
import type { BranchOption, CategoryOption, FieldChangeParams, Transaction } from '../editHelpers';
import {
  computeMissingCategory,
  getCategoryChipSx,
  getEditValue,
  getFieldDisplay,
  getRowSx,
  isMultilineField,
} from '../helpers/transactionDisplayHelpers';

type SelectFieldItem = { id: string; name: string };
type SelectEditCellParams = {
  value: string;
  items: SelectFieldItem[];
  multiline: boolean;
  notSelectedLabel: string;
  onChange: (value: string) => void;
};

function SelectEditCell({
  value,
  items,
  multiline,
  notSelectedLabel,
  onChange,
}: SelectEditCellParams): React.ReactElement {
  return (
    <TextField
      size="small"
      fullWidth
      multiline={multiline}
      select
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <MenuItem value="">{notSelectedLabel}</MenuItem>
      {items.map(item => (
        <MenuItem key={item.id} value={item.id}>
          {item.name}
        </MenuItem>
      ))}
    </TextField>
  );
}

type EditCellParams = {
  transaction: Transaction;
  edited: Partial<Transaction>;
  field: keyof Transaction;
  categories: CategoryOption[];
  branches: BranchOption[];
  wallets: BranchOption[];
  onFieldChange: (params: FieldChangeParams) => void;
  notSelectedLabel: string;
};

function EditCell({
  transaction,
  edited,
  field,
  categories,
  branches,
  wallets,
  onFieldChange,
  notSelectedLabel,
}: EditCellParams): React.ReactElement {
  const multiline = isMultilineField(field);
  const onChange = (value: string): void => onFieldChange({ id: transaction.id, field, value });
  const editValue = (f: keyof Transaction): string => getEditValue(edited, transaction, f);
  if (field === 'categoryId') {
    return (
      <SelectEditCell
        value={editValue('categoryId')}
        items={categories}
        multiline={multiline}
        notSelectedLabel={notSelectedLabel}
        onChange={onChange}
      />
    );
  }
  if (field === 'branchId') {
    return (
      <SelectEditCell
        value={editValue('branchId')}
        items={branches}
        multiline={multiline}
        notSelectedLabel={notSelectedLabel}
        onChange={onChange}
      />
    );
  }
  if (field === 'walletId') {
    return (
      <SelectEditCell
        value={editValue('walletId')}
        items={wallets}
        multiline={multiline}
        notSelectedLabel={notSelectedLabel}
        onChange={onChange}
      />
    );
  }
  return (
    <TextField
      size="small"
      fullWidth
      multiline={multiline}
      value={editValue(field)}
      onChange={e => onChange(e.target.value)}
    />
  );
}

type CategoryChipProps = {
  transaction: Transaction;
  locale: string;
  noCategoryLabel: string;
  assignCategoryLabel: string;
};

function CategoryChip({
  transaction,
  locale,
  noCategoryLabel,
  assignCategoryLabel,
}: CategoryChipProps): React.ReactElement {
  if (!transaction.category?.name) {
    return (
      <Chip
        label={noCategoryLabel}
        size="small"
        icon={<TriangleAlert size={16} />}
        sx={{
          bgcolor: 'error.50',
          color: 'error.700',
          border: '1px solid',
          borderColor: 'error.100',
          fontWeight: 600,
          fontSize: '0.8125rem',
          '& .MuiChip-icon': { color: 'error.600' },
        }}
      />
    );
  }
  const isDisabled = transaction.category.isEnabled === false;
  const displayName = getCategoryDisplayName(
    {
      name: transaction.category.name,
      source: transaction.category.source,
      isSystem: transaction.category.isSystem,
    },
    locale,
  );
  return (
    <Chip
      label={isDisabled ? `${displayName} — ${assignCategoryLabel}` : displayName}
      size="small"
      sx={getCategoryChipSx(isDisabled)}
    />
  );
}

type RowActionsProps = {
  isEditing: boolean;
  transaction: Transaction;
  confirmDeleteLabel: string;
  onSave: (id: string) => void;
  onCancel: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => Promise<void>;
};

function RowActions({
  isEditing,
  transaction,
  confirmDeleteLabel,
  onSave,
  onCancel,
  onEdit,
  onDelete,
}: RowActionsProps): React.ReactElement {
  if (isEditing) {
    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <IconButton
          size="small"
          onClick={() => onSave(transaction.id)}
          sx={{ color: 'success.600', '&:hover': { bgcolor: 'success.50' } }}
        >
          <CheckCircle2 size={18} />
        </IconButton>
        <IconButton
          size="small"
          onClick={onCancel}
          sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'grey.100' } }}
        >
          <XCircle size={18} />
        </IconButton>
      </Box>
    );
  }
  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <IconButton
        size="small"
        onClick={() => onEdit(transaction)}
        sx={{ color: 'primary.600', '&:hover': { bgcolor: 'primary.50' } }}
      >
        <Pencil size={18} />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => {
          if (window.confirm(confirmDeleteLabel)) {
            void onDelete(transaction.id);
          }
        }}
        sx={{ color: 'error.600', '&:hover': { bgcolor: 'error.50' } }}
      >
        <Trash2 size={18} />
      </IconButton>
    </Box>
  );
}

export type TransactionRowProps = {
  transaction: Transaction;
  isEditing: boolean;
  edited: Partial<Transaction>;
  selectedRows: Set<string>;
  categories: CategoryOption[];
  branches: BranchOption[];
  wallets: BranchOption[];
  locale: string;
  formatNumber: (n?: number | null) => string;
  confirmDeleteLabel: string;
  notSelectedLabel: string;
  noCategoryLabel: string;
  assignCategoryLabel: string;
  onRowSelect: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onSave: (id: string) => void;
  onCancel: () => void;
  onDelete: (id: string) => Promise<void>;
  onFieldChange: (params: FieldChangeParams) => void;
};

export function TransactionRow({
  transaction,
  isEditing,
  edited,
  selectedRows,
  categories,
  branches,
  wallets,
  locale,
  formatNumber,
  confirmDeleteLabel,
  notSelectedLabel,
  noCategoryLabel,
  assignCategoryLabel,
  onRowSelect,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onFieldChange,
}: TransactionRowProps): React.ReactElement {
  const missingCategory = computeMissingCategory(edited, transaction);
  const rowSx = getRowSx(missingCategory);
  const display = (field: keyof Transaction): string =>
    getFieldDisplay({ tx: transaction, field, locale, fmt: formatNumber });
  const editCell = (field: keyof Transaction): React.ReactElement => (
    <EditCell
      transaction={transaction}
      edited={edited}
      field={field}
      categories={categories}
      branches={branches}
      wallets={wallets}
      onFieldChange={onFieldChange}
      notSelectedLabel={notSelectedLabel}
    />
  );
  return (
    <TableRow hover sx={rowSx}>
      <TableCell padding="checkbox">
        <Checkbox
          checked={selectedRows.has(transaction.id)}
          onCheckedChange={() => onRowSelect(transaction.id)}
        />
      </TableCell>
      <TableCell sx={{ minWidth: 100 }}>
        {isEditing ? editCell('transactionDate') : display('transactionDate')}
      </TableCell>
      <TableCell sx={{ minWidth: 150 }}>
        {isEditing ? editCell('counterpartyName') : transaction.counterpartyName}
      </TableCell>
      <TableCell sx={{ minWidth: 200, maxWidth: 300 }}>
        {isEditing ? (
          editCell('paymentPurpose')
        ) : (
          <Tooltip title={transaction.paymentPurpose}>
            <Typography
              variant="body2"
              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {transaction.paymentPurpose}
            </Typography>
          </Tooltip>
        )}
      </TableCell>
      <TableCell align="right" sx={{ color: 'error.600', fontWeight: 600, fontSize: '0.9375rem' }}>
        {display('debit')}
      </TableCell>
      <TableCell
        align="right"
        sx={{ color: 'success.600', fontWeight: 600, fontSize: '0.9375rem' }}
      >
        {display('credit')}
      </TableCell>
      <TableCell sx={{ minWidth: 150 }}>
        {isEditing ? (
          editCell('categoryId')
        ) : (
          <CategoryChip
            transaction={transaction}
            locale={locale}
            noCategoryLabel={noCategoryLabel}
            assignCategoryLabel={assignCategoryLabel}
          />
        )}
      </TableCell>
      <TableCell>
        <RowActions
          isEditing={isEditing}
          transaction={transaction}
          confirmDeleteLabel={confirmDeleteLabel}
          onSave={onSave}
          onCancel={onCancel}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
}
