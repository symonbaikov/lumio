'use client';

import { applyStatementsFilters } from '@/app/(main)/statements/components/filters/statement-filters';
import {
  isReceiptDerivedStatement,
  paginateStatements,
  resolveStatementSortDate,
} from '@/app/(main)/statements/components/StatementsListView.utils';
import type { StatementFilters } from '@/app/(main)/statements/components/filters/statement-filters';
import { type StatementStage, getStatementStage } from '@/app/lib/statement-workflow';
import { useMemo } from 'react';

interface StatementForStaging {
  id: string;
  source?: 'statement' | 'gmail' | 'scan';
  status: string;
  fileName: string;
  subject?: string | null;
  sender?: string | null;
  parsedData?: { vendor?: string | null; date?: string | null } | null;
  parsingDetails?: {
    detectedBy?: string;
    importPreview?: { source?: string };
    metadataExtracted?: { currency?: string; headerDisplay?: { currencyDisplay?: string } };
  };
}

interface UseStagedStatementsParams {
  statements: StatementForStaging[];
  receiptStatements: StatementForStaging[];
  appliedFilters: StatementFilters;
  stage: StatementStage;
  search: string;
  dateSortDirection: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

interface UseStagedStatementsResult<T extends StatementForStaging> {
  stagedStatements: T[];
  displayStatements: T[];
  sortedDisplayStatements: T[];
  paginatedDisplayStatements: T[];
  total: number;
  totalPagesCount: number;
  rangeStart: number;
  rangeEnd: number;
}

function filterReceiptsBySearch<T extends StatementForStaging>(receipts: T[], search: string): T[] {
  const q = search.trim().toLowerCase();
  if (!q) {
    return receipts;
  }
  return receipts.filter(
    s =>
      s.fileName.toLowerCase().includes(q) ||
      (s.subject || '').toLowerCase().includes(q) ||
      (s.sender || '').toLowerCase().includes(q) ||
      (s.parsedData?.vendor || '').toLowerCase().includes(q),
  );
}

function sortByDate<T extends StatementForStaging>(
  statements: T[],
  direction: 'asc' | 'desc',
): T[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...statements].sort((l, r) => {
    const diff =
      resolveStatementSortDate(l as Parameters<typeof resolveStatementSortDate>[0]) -
      resolveStatementSortDate(r as Parameters<typeof resolveStatementSortDate>[0]);
    if (diff !== 0) {
      return diff * factor;
    }
    return l.id.localeCompare(r.id) * factor;
  });
}

export function useStagedStatements<T extends StatementForStaging>({
  statements,
  receiptStatements,
  appliedFilters,
  stage,
  search,
  dateSortDirection,
  page,
  pageSize,
}: UseStagedStatementsParams): UseStagedStatementsResult<T> {
  const stagedStatements = useMemo((): T[] => {
    const base = statements.filter(
      s => getStatementStage(s.id) === stage && !isReceiptDerivedStatement(s),
    ) as T[];
    if (stage !== 'submit') {
      return base;
    }

    const filtered = filterReceiptsBySearch(receiptStatements as T[], search);
    return [...filtered, ...base].sort(
      (a, b) =>
        resolveStatementSortDate(b as Parameters<typeof resolveStatementSortDate>[0]) -
        resolveStatementSortDate(a as Parameters<typeof resolveStatementSortDate>[0]),
    );
  }, [statements, stage, search, receiptStatements]);

  const displayStatements = useMemo(
    () => applyStatementsFilters(stagedStatements, appliedFilters) as T[],
    [stagedStatements, appliedFilters],
  );

  const sortedDisplayStatements = useMemo(
    () => sortByDate(displayStatements, dateSortDirection),
    [displayStatements, dateSortDirection],
  );

  const paginatedDisplayStatements = useMemo(
    () => paginateStatements(sortedDisplayStatements, page, pageSize) as T[],
    [sortedDisplayStatements, page, pageSize],
  );

  const total = sortedDisplayStatements.length;
  const totalPagesCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(total, page * pageSize);

  return {
    stagedStatements,
    displayStatements,
    sortedDisplayStatements,
    paginatedDisplayStatements,
    total,
    totalPagesCount,
    rangeStart,
    rangeEnd,
  };
}
