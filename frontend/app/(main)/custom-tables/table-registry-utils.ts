export type TableRegistryItem = {
  id: string;
  name: string;
  description?: string | null;
  source?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const isStatementsBackedTable = (item: TableRegistryItem) => {
  const source = (item.source || '').toLowerCase();
  return source.includes('statement');
};

export const resolveTablePurpose = (item: TableRegistryItem): string => {
  const source = (item.source || '').toLowerCase();
  const haystack = `${item.name || ''} ${item.description || ''}`.toLowerCase();

  if (haystack.includes('recon') || haystack.includes('reconciliation')) {
    return 'Reconciliation';
  }

  if (haystack.includes('mapping') || haystack.includes('map') || haystack.includes('categor')) {
    return 'Categories mapping';
  }

  if (source.includes('statement') || source.includes('receipt') || source.includes('export')) {
    return 'Export';
  }

  return 'Export';
};

export const resolveSourceSummary = (item: TableRegistryItem): string => {
  const source = (item.source || '').toLowerCase();

  if (source === 'google_sheets_import') return 'Google Sheets';
  if (source.includes('statement')) return 'Statements';
  if (source.includes('receipt')) return 'Receipts';
  if (source === 'manual') return 'Manual';
  if (source) return source.replace(/_/g, ' ');
  return 'Manual';
};

const isGenericTableName = (name?: string | null): boolean => {
  const normalized = (name || '').trim();
  if (!normalized) return true;

  if (/^\d+$/.test(normalized)) return true;
  if (/^table\s*\d*$/i.test(normalized)) return true;
  if (/^export\s*\d*$/i.test(normalized)) return true;

  return normalized.length < 3;
};

export const resolveHumanTableName = (item: TableRegistryItem): string => {
  const normalized = (item.name || '').trim();
  if (!isGenericTableName(normalized)) {
    return normalized;
  }

  const source = resolveSourceSummary(item);
  const date = new Date(item.updatedAt || item.createdAt || '');
  const hasValidDate = !Number.isNaN(date.getTime());
  const period = hasValidDate ? `${MONTH_SHORT[date.getUTCMonth()]} ${date.getUTCFullYear()}` : '';

  const prefix =
    source === 'Statements'
      ? 'Bank statements export'
      : source === 'Receipts'
        ? 'Receipts export'
        : source === 'Google Sheets'
          ? 'Google Sheets export'
          : 'Export table';

  return period ? `${prefix} - ${period}` : prefix;
};

export const resolveCreatedFromBadge = (item: TableRegistryItem): string | null => {
  if (!isStatementsBackedTable(item)) {
    return null;
  }

  const date = new Date(item.createdAt || item.updatedAt || '');
  if (Number.isNaN(date.getTime())) {
    return 'Created from Statements';
  }

  const month = MONTH_SHORT[date.getUTCMonth()] || MONTH_SHORT[0];
  const year = date.getUTCFullYear();
  return `Created from Statements (${month} ${year})`;
};

export const formatRowsCount = (count?: number | null): string => {
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) {
    return '—';
  }

  return count.toLocaleString('en-US');
};
