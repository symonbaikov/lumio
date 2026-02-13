export type StatementColumnId =
  | 'receipt'
  | 'date'
  | 'merchant'
  | 'from'
  | 'to'
  | 'category'
  | 'tag'
  | 'amount'
  | 'action'
  | 'approved'
  | 'billable'
  | 'card'
  | 'description'
  | 'exchangeRate'
  | 'exported'
  | 'exportedTo';

export type StatementColumn = {
  id: StatementColumnId;
  label: string;
  visible: boolean;
  order: number;
};

export const STATEMENT_COLUMNS_STORAGE_KEY = 'finflow-statement-columns';

export const DEFAULT_STATEMENT_COLUMNS: StatementColumn[] = [
  { id: 'receipt', label: 'Receipt', visible: true, order: 0 },
  { id: 'date', label: 'Date', visible: true, order: 1 },
  { id: 'merchant', label: 'Merchant', visible: true, order: 2 },
  { id: 'from', label: 'From', visible: true, order: 3 },
  { id: 'to', label: 'To', visible: true, order: 4 },
  { id: 'category', label: 'Category', visible: true, order: 5 },
  { id: 'tag', label: 'Tag', visible: true, order: 6 },
  { id: 'amount', label: 'Amount', visible: true, order: 7 },
  { id: 'action', label: 'Action', visible: true, order: 8 },
  { id: 'approved', label: 'Approved', visible: false, order: 9 },
  { id: 'billable', label: 'Billable', visible: false, order: 10 },
  { id: 'card', label: 'Card', visible: false, order: 11 },
  { id: 'description', label: 'Description', visible: false, order: 12 },
  { id: 'exchangeRate', label: 'Exchange rate', visible: false, order: 13 },
  { id: 'exported', label: 'Exported', visible: false, order: 14 },
  { id: 'exportedTo', label: 'Exported to', visible: false, order: 15 },
];

const sortColumns = (columns: StatementColumn[]) => [...columns].sort((a, b) => a.order - b.order);

export const loadStatementColumns = (): StatementColumn[] => {
  if (typeof window === 'undefined') return DEFAULT_STATEMENT_COLUMNS;
  const raw = localStorage.getItem(STATEMENT_COLUMNS_STORAGE_KEY);
  if (!raw) return DEFAULT_STATEMENT_COLUMNS;
  try {
    const parsed = JSON.parse(raw) as Array<Partial<StatementColumn>>;
    const merged = DEFAULT_STATEMENT_COLUMNS.map(column => {
      const override = parsed.find(item => item.id === column.id);
      return {
        ...column,
        visible: override?.visible ?? column.visible,
        order: typeof override?.order === 'number' ? override.order : column.order,
      };
    });
    return sortColumns(merged);
  } catch {
    return DEFAULT_STATEMENT_COLUMNS;
  }
};

export const saveStatementColumns = (columns: StatementColumn[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STATEMENT_COLUMNS_STORAGE_KEY, JSON.stringify(columns));
};

export const reorderStatementColumns = (
  columns: StatementColumn[],
  activeId: StatementColumnId,
  overId: StatementColumnId,
) => {
  if (activeId === overId) return columns;
  const activeIndex = columns.findIndex(column => column.id === activeId);
  const overIndex = columns.findIndex(column => column.id === overId);
  if (activeIndex === -1 || overIndex === -1) return columns;

  const next = [...columns];
  const [moved] = next.splice(activeIndex, 1);
  next.splice(overIndex, 0, moved);
  return next.map((column, index) => ({ ...column, order: index }));
};
