import type { CustomTableColumn, CustomTableColumnConfig, SheetStyle } from './stylingUtils';

export interface CustomTablePageColumn extends CustomTableColumn {
  isRequired: boolean;
  isUnique: boolean;
  width?: number;
  config: CustomTableColumnConfig | null;
  style?: {
    header?: SheetStyle;
    cell?: SheetStyle;
  } | null;
}

export interface CustomTableViewColumnSettings {
  width?: number;
  aggregate?: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

export interface CustomTableSavedView {
  id: string;
  name: string;
  columnFilters?: Record<string, unknown>;
  sort?: { col: string; dir: 'asc' | 'desc' } | null;
  columnOrder?: string[];
  hiddenColumnKeys?: string[];
  aggregates?: Record<string, 'sum' | 'avg' | 'min' | 'max' | 'count'>;
}

export interface CustomTableViewSettings {
  columns?: Record<string, CustomTableViewColumnSettings>;
  views?: CustomTableSavedView[];
  activeViewId?: string | null;
  conditionalRules?: unknown[];
}

export interface CustomTable {
  id: string;
  name: string;
  description: string | null;
  source: string;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
    color?: string | null;
    icon?: string | null;
  } | null;
  columns: CustomTablePageColumn[];
  viewSettings?: CustomTableViewSettings | null;
}
