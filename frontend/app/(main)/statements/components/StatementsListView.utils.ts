import {
  type StatementColumn,
  type StatementColumnId,
  getAllowedStatementFilterKeys,
  resetDisallowedStatementFilters,
} from './columns/statement-columns';
import {
  getVisibleFilterScreens,
  resetHiddenStatementFilters,
  serializeStatementFiltersToQuery,
} from './filters/server-statement-filters';
import type { StatementFilters } from './filters/statement-filters';

export const buildStatementRequestParams = ({
  appliedFilters,
  search,
}: {
  appliedFilters: StatementFilters;
  search?: string;
}) => ({
  ...serializeStatementFiltersToQuery(appliedFilters),
  ...(search ? { search } : {}),
});

export const paginateStatements = <T>(statements: T[], page: number, pageSize: number): T[] => {
  if (pageSize <= 0) return [];
  const currentPage = Math.max(1, page);
  const start = (currentPage - 1) * pageSize;
  return statements.slice(start, start + pageSize);
};

export const deriveVisibleFilterScreens = (
  columns: Array<Pick<StatementColumn, 'id' | 'visible'>>,
) => {
  const visibleColumnIds = columns.filter(column => column.visible).map(column => column.id);
  return getVisibleFilterScreens(visibleColumnIds);
};

export const reconcileFiltersWithColumns = ({
  columns,
  appliedFilters,
  draftFilters,
}: {
  columns: StatementColumn[];
  appliedFilters: StatementFilters;
  draftFilters: StatementFilters;
}) => {
  const visibleColumnIds = columns.filter(column => column.visible).map(column => column.id);
  const allowedFilterKeys = getAllowedStatementFilterKeys(visibleColumnIds as StatementColumnId[]);

  return {
    allowedFilterKeys,
    nextAppliedFilters: resetDisallowedStatementFilters(appliedFilters, allowedFilterKeys),
    nextDraftFilters: resetHiddenStatementFilters(draftFilters, allowedFilterKeys),
  };
};
