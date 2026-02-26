export interface StatementSelectionInput {
  id: string;
  fileName: string;
  status: string;
  totalTransactions: number;
  statementDateFrom?: string | null;
  statementDateTo?: string | null;
  createdAt: string;
  bankName?: string | null;
}

export interface StatementSelectionOption {
  representativeId: string;
  statementIds: string[];
  duplicateCount: number;
  title: string;
  sourceLabel: string;
  periodLabel: string;
  fileLabel: string;
  rows: number;
  rowsLabel: string;
  disabled: boolean;
  searchText: string;
  createdAt: string;
}

export type StatementGroupBy = 'source' | 'period';

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const TECHNICAL_TOKEN_REGEX = /[A-Z0-9]{10,}/;

const FILE_SOURCE_FALLBACKS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /kaspi/i, label: 'Kaspi' },
  { pattern: /bereke/i, label: 'Bereke' },
  { pattern: /halyk/i, label: 'Halyk' },
  { pattern: /bcc|centercredit/i, label: 'BCC' },
  { pattern: /jusan/i, label: 'Jusan' },
];

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const normalizeFileBase = (fileName: string) => {
  const withoutExtension = fileName.replace(/\.[a-z0-9]+$/i, '');
  return withoutExtension.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
};

const shortenTechnicalToken = (token: string) => {
  if (!TECHNICAL_TOKEN_REGEX.test(token)) return token;
  if (token.length <= 14) return token;
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
};

const shortenReadableFileName = (fileName: string, maxLength = 42) => {
  const normalized = normalizeFileBase(fileName)
    .split(' ')
    .map(shortenTechnicalToken)
    .join(' ')
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
};

const resolveSourceLabel = (statement: StatementSelectionInput): string => {
  const bankName = statement.bankName?.trim();
  if (bankName) return bankName;

  const byFileName = FILE_SOURCE_FALLBACKS.find(item => item.pattern.test(statement.fileName));
  if (byFileName) return byFileName.label;

  return 'Unknown source';
};

const resolvePeriodLabel = (statement: StatementSelectionInput): string => {
  const from = parseDate(statement.statementDateFrom);
  const to = parseDate(statement.statementDateTo);
  const fallback = parseDate(statement.createdAt);

  const start = from || to || fallback;
  const end = to || from || fallback;
  if (!start || !end) return 'Unknown period';

  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();

  if (sameMonth) {
    return MONTH_YEAR_FORMATTER.format(end);
  }

  const startLabel = start.toISOString().slice(0, 10);
  const endLabel = end.toISOString().slice(0, 10);
  return `${startLabel} - ${endLabel}`;
};

const normalizeStatus = (value: string) => value.toLowerCase();

const buildDeduplicationKey = (statement: StatementSelectionInput) => {
  return [
    normalizeFileBase(statement.fileName).toLowerCase(),
    resolveSourceLabel(statement).toLowerCase(),
    resolvePeriodLabel(statement).toLowerCase(),
    String(statement.totalTransactions || 0),
  ].join('::');
};

export const buildStatementSelectionOptions = (
  statements: StatementSelectionInput[],
): StatementSelectionOption[] => {
  const sorted = [...statements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const groups = new Map<string, StatementSelectionInput[]>();

  sorted.forEach(statement => {
    const key = buildDeduplicationKey(statement);
    const existing = groups.get(key);
    if (existing) {
      existing.push(statement);
      return;
    }
    groups.set(key, [statement]);
  });

  return Array.from(groups.values()).map(group => {
    const representative = group[0];
    const rows = Number(representative.totalTransactions) || 0;
    const periodLabel = resolvePeriodLabel(representative);
    const sourceLabel = resolveSourceLabel(representative);
    const status = normalizeStatus(representative.status || '');
    const disabled = rows <= 0 || ['error', 'uploaded', 'processing'].includes(status);

    return {
      representativeId: representative.id,
      statementIds: group.map(statement => statement.id),
      duplicateCount: group.length,
      title: `Bank statement - ${periodLabel}`,
      sourceLabel,
      periodLabel,
      fileLabel: shortenReadableFileName(representative.fileName || representative.id),
      rows,
      rowsLabel: `Rows: ${rows}`,
      disabled,
      searchText: [
        representative.fileName,
        sourceLabel,
        periodLabel,
        shortenReadableFileName(representative.fileName || representative.id),
      ]
        .join(' ')
        .toLowerCase(),
      createdAt: representative.createdAt,
    };
  });
};

export const filterStatementSelectionOptions = (
  options: StatementSelectionOption[],
  filters: { query?: string; source?: string },
): StatementSelectionOption[] => {
  const query = filters.query?.trim().toLowerCase();
  const source = filters.source?.trim().toLowerCase();

  return options.filter(option => {
    const sourceMatches =
      !source || source === 'all' || option.sourceLabel.toLowerCase() === source;
    if (!sourceMatches) return false;
    if (!query) return true;
    return option.searchText.includes(query);
  });
};

export const groupStatementSelectionOptions = (
  options: StatementSelectionOption[],
  groupBy: StatementGroupBy,
): Array<{ key: string; label: string; options: StatementSelectionOption[] }> => {
  const map = new Map<string, StatementSelectionOption[]>();

  options.forEach(option => {
    const key = groupBy === 'source' ? option.sourceLabel : option.periodLabel;
    const existing = map.get(key);
    if (existing) {
      existing.push(option);
      return;
    }
    map.set(key, [option]);
  });

  return Array.from(map.entries())
    .map(([key, groupedOptions]) => ({
      key,
      label: key,
      options: groupedOptions,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const getSelectedStatementsSummary = (
  options: StatementSelectionOption[],
  selectedIds: string[],
): { selectedCount: number; totalRows: number } => {
  if (!selectedIds.length) {
    return { selectedCount: 0, totalRows: 0 };
  }

  const selectedSet = new Set(selectedIds);
  const selectedOptions = options.filter(option => selectedSet.has(option.representativeId));

  return {
    selectedCount: selectedOptions.length,
    totalRows: selectedOptions.reduce((sum, option) => sum + option.rows, 0),
  };
};
