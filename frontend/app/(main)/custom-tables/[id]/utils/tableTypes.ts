import type { AggregateFn, CustomTableColumn } from './types';

export interface CustomTablePageColumn extends CustomTableColumn {
  isRequired: boolean;
  isUnique: boolean;
}

export interface CustomTableViewColumnSettings {
  width?: number;
  aggregate?: AggregateFn;
}

export interface CustomTableViewSettings {
  columns?: Record<string, CustomTableViewColumnSettings>;
  [key: string]: unknown;
}

export interface CustomTableCategory {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

export interface CustomTable {
  id: string;
  name: string;
  description: string | null;
  source: string;
  categoryId?: string | null;
  category?: CustomTableCategory | null;
  columns: CustomTablePageColumn[];
  viewSettings?: CustomTableViewSettings | null;
}
