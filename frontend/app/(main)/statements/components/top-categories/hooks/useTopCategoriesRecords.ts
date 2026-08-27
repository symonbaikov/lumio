import {
  type StatementFilterItem,
  type StatementFilters,
  applyStatementsFilters,
} from '@/app/(main)/statements/components/filters/statement-filters';
import type { AnalyticsFromOption } from '@/app/(main)/statements/components/shared-analytics.utils';
import type {
  TopCategoryFlowType,
  TopCategoryRecord,
} from '@/app/(main)/statements/components/top-categories.utils';
import { dedupeCategoryReceiptRecords } from '@/app/(main)/statements/components/top-categories.utils';
import {
  getBankDisplayName,
  mapGmailReceiptToCategoryRecord,
  mapTransactionToCategoryRecord,
} from '@/app/(main)/statements/components/top-categories/helpers/top-categories-mappers';
import type {
  GmailReceipt,
  StatementMeta,
  Transaction,
} from '@/app/(main)/statements/types/statement-types';
import { useMemo } from 'react';

type StatementWithWorkspace = StatementMeta & StatementFilterItem;

type Params = {
  statements: StatementWithWorkspace[];
  transactions: Transaction[];
  gmailReceipts: GmailReceipt[];
  workspaceCurrency: string;
  appliedFilters: StatementFilters;
  searchInput: string;
  activeFlowType: TopCategoryFlowType;
};

export type CategoryFromOption = AnalyticsFromOption;

export type CategoryRecordsReturn = {
  allRecords: TopCategoryRecord[];
  flowFilteredRecords: TopCategoryRecord[];
  flowRecordsWithoutDateFilter: TopCategoryRecord[];
  fromOptions: CategoryFromOption[];
  currencyOptions: string[];
};

const orMatch = (s: string | null | undefined, q: string): boolean =>
  (s ?? '').toLowerCase().includes(q);

const matchesQuery = (r: TopCategoryRecord, query: string): boolean =>
  r.category.toLowerCase().includes(query) ||
  orMatch(r.sender, query) ||
  orMatch(r.subject, query) ||
  orMatch(r.paymentPurpose, query) ||
  orMatch(r.counterpartyName, query) ||
  orMatch(r.bankName, query);

const filterByQuery = (records: TopCategoryRecord[], searchInput: string): TopCategoryRecord[] => {
  const query = searchInput.trim().toLowerCase();
  if (!query) {
    return records;
  }
  return records.filter(r => matchesQuery(r, query));
};

const getUserLabel = (user: TopCategoryRecord['user']): string =>
  user?.name ?? user?.email ?? 'User';

const getUserDescription = (user: TopCategoryRecord['user']): string | null => {
  const email = user?.email;
  return email ? `@${email.split('@')[0]}` : null;
};

const buildUserOption = (record: TopCategoryRecord): CategoryFromOption | null => {
  const uid = record.user?.id;
  if (!uid) {
    return null;
  }
  return {
    id: `user:${uid}`,
    label: getUserLabel(record.user),
    description: getUserDescription(record.user),
  };
};

const buildBankOption = (bank: string): CategoryFromOption => ({
  id: `bank:${bank}`,
  label: bank === 'gmail' ? 'Gmail' : getBankDisplayName(bank),
  description: null,
  bankName: bank,
});

const buildFromOptions = (allRecords: TopCategoryRecord[]): CategoryFromOption[] => {
  const seen = new Map<string, CategoryFromOption>();
  allRecords.forEach(record => {
    const userOpt = buildUserOption(record);
    if (userOpt && !seen.has(userOpt.id)) {
      seen.set(userOpt.id, userOpt);
    }
    const bank = record.bankName;
    if (bank && !seen.has(`bank:${bank}`)) {
      seen.set(`bank:${bank}`, buildBankOption(bank));
    }
  });
  return Array.from(seen.values());
};

type BuildAllParams = {
  statements: StatementWithWorkspace[];
  transactions: Transaction[];
  gmailReceipts: GmailReceipt[];
  workspaceCurrency: string;
};

const buildAllCategoryRecords = ({
  statements,
  transactions,
  gmailReceipts,
  workspaceCurrency,
}: BuildAllParams): TopCategoryRecord[] => {
  const statementById = new Map(statements.map(s => [s.id, s]));
  const mappedTransactions = transactions
    .map(item => {
      const meta = item.statementId ? statementById.get(item.statementId) : undefined;
      return mapTransactionToCategoryRecord(
        item,
        meta as StatementMeta | undefined,
        workspaceCurrency,
      );
    })
    .filter((r): r is TopCategoryRecord => r !== null);
  const existingTransactionIds = new Set(transactions.map(t => t.id).filter(Boolean));
  const mappedReceipts = dedupeCategoryReceiptRecords(
    gmailReceipts
      .map(r => mapGmailReceiptToCategoryRecord(r, workspaceCurrency))
      .filter((r): r is TopCategoryRecord => r !== null),
    existingTransactionIds,
  );
  return [...mappedTransactions, ...mappedReceipts];
};

export const useTopCategoriesRecords = ({
  statements,
  transactions,
  gmailReceipts,
  workspaceCurrency,
  appliedFilters,
  searchInput,
  activeFlowType,
}: Params): CategoryRecordsReturn => {
  const allRecords = useMemo<TopCategoryRecord[]>(
    () => buildAllCategoryRecords({ statements, transactions, gmailReceipts, workspaceCurrency }),
    [statements, transactions, gmailReceipts, workspaceCurrency],
  );

  const filteredRecords = useMemo(
    () =>
      filterByQuery(
        applyStatementsFilters<TopCategoryRecord>(allRecords, appliedFilters),
        searchInput,
      ),
    [allRecords, appliedFilters, searchInput],
  );

  const flowFilteredRecords = useMemo(
    () => filteredRecords.filter(r => r.flowType === activeFlowType),
    [filteredRecords, activeFlowType],
  );

  const recordsWithoutDateFilter = useMemo(
    () =>
      filterByQuery(
        applyStatementsFilters<TopCategoryRecord>(allRecords, { ...appliedFilters, date: null }),
        searchInput,
      ),
    [allRecords, appliedFilters, searchInput],
  );

  const flowRecordsWithoutDateFilter = useMemo(
    () => recordsWithoutDateFilter.filter(r => r.flowType === activeFlowType),
    [recordsWithoutDateFilter, activeFlowType],
  );

  const fromOptions = useMemo(() => buildFromOptions(allRecords), [allRecords]);

  const currencyOptions = useMemo(
    () => Array.from(new Set(allRecords.map(r => r.currencyValue).filter(Boolean))),
    [allRecords],
  );

  return {
    allRecords,
    flowFilteredRecords,
    flowRecordsWithoutDateFilter,
    fromOptions,
    currencyOptions,
  };
};
