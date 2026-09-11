import { useMemo } from 'react';
import {
  applyStatementsFilters,
  type StatementFilterItem,
  type StatementFilters,
} from '@/app/(main)/statements/components/filters/statement-filters';
import {
  getBankDisplayName,
  mapGmailReceiptToSpendRecord,
  mapTransactionToSpendRecord,
} from '@/app/(main)/statements/components/spend-over-time/helpers/spend-over-time-mappers';
import type {
  SpendOverTimeFlowType,
  SpendOverTimeRecord,
} from '@/app/(main)/statements/components/spend-over-time.utils';
import { dedupeSpendOverTimeReceiptRecords } from '@/app/(main)/statements/components/spend-over-time.utils';
import type {
  GmailReceipt,
  StatementMeta,
  Transaction,
} from '@/app/(main)/statements/types/statement-types';

type StatementWithWorkspace = StatementMeta & StatementFilterItem;

type Params = {
  statements: StatementWithWorkspace[];
  transactions: Transaction[];
  gmailReceipts: GmailReceipt[];
  workspaceCurrency: string;
  appliedFilters: StatementFilters;
  searchInput: string;
  activeFlowType: SpendOverTimeFlowType;
};

export type SpendFromOption = {
  id: string;
  label: string;
  description?: string | null;
  bankName?: string | null;
};

export type SpendRecordsReturn = {
  allRecords: SpendOverTimeRecord[];
  flowFilteredRecords: SpendOverTimeRecord[];
  flowRecordsWithoutDateFilter: SpendOverTimeRecord[];
  fromOptions: SpendFromOption[];
  currencyOptions: string[];
};

const orMatch = (s: string | null | undefined, q: string): boolean =>
  (s ?? '').toLowerCase().includes(q);

const matchesQuery = (r: SpendOverTimeRecord, query: string): boolean =>
  orMatch(r.merchant, query) ||
  orMatch(r.sender, query) ||
  orMatch(r.subject, query) ||
  orMatch(r.paymentPurpose, query) ||
  orMatch(r.bankName, query);

const filterByQuery = (
  records: SpendOverTimeRecord[],
  searchInput: string,
): SpendOverTimeRecord[] => {
  const query = searchInput.trim().toLowerCase();
  if (!query) {
    return records;
  }
  return records.filter(r => matchesQuery(r, query));
};

const getUserLabel = (user: SpendOverTimeRecord['user']): string =>
  user?.name ?? user?.email ?? 'User';

const getUserDescription = (user: SpendOverTimeRecord['user']): string | null => {
  const email = user?.email;
  return email ? `@${email.split('@')[0]}` : null;
};

const buildUserOption = (record: SpendOverTimeRecord): SpendFromOption | null => {
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

const buildBankOption = (bank: string): SpendFromOption => ({
  id: `bank:${bank}`,
  label: bank === 'gmail' ? 'Gmail' : getBankDisplayName(bank),
  description: null,
  bankName: bank,
});

const buildFromOptions = (allRecords: SpendOverTimeRecord[]): SpendFromOption[] => {
  const seen = new Map<string, SpendFromOption>();
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

const buildAllSpendRecords = ({
  statements,
  transactions,
  gmailReceipts,
  workspaceCurrency,
}: BuildAllParams): SpendOverTimeRecord[] => {
  const statementById = new Map(statements.map(s => [s.id, s]));
  const mappedTransactions = transactions
    .map(item => {
      const meta = item.statementId ? statementById.get(item.statementId) : undefined;
      return mapTransactionToSpendRecord(
        item,
        meta as StatementMeta | undefined,
        workspaceCurrency,
      );
    })
    .filter((r): r is SpendOverTimeRecord => r !== null);
  const existingTransactionIds = new Set(transactions.map(t => t.id).filter(Boolean));
  const mappedReceipts = dedupeSpendOverTimeReceiptRecords(
    gmailReceipts
      .map(r => mapGmailReceiptToSpendRecord(r, workspaceCurrency))
      .filter((r): r is SpendOverTimeRecord => r !== null),
    existingTransactionIds,
  );
  return [...mappedTransactions, ...mappedReceipts];
};

export const useSpendOverTimeRecords = ({
  statements,
  transactions,
  gmailReceipts,
  workspaceCurrency,
  appliedFilters,
  searchInput,
  activeFlowType,
}: Params): SpendRecordsReturn => {
  const allRecords = useMemo<SpendOverTimeRecord[]>(
    () => buildAllSpendRecords({ statements, transactions, gmailReceipts, workspaceCurrency }),
    [statements, transactions, gmailReceipts, workspaceCurrency],
  );

  const filteredRecords = useMemo(
    () =>
      filterByQuery(
        applyStatementsFilters<SpendOverTimeRecord>(allRecords, appliedFilters),
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
        applyStatementsFilters<SpendOverTimeRecord>(allRecords, { ...appliedFilters, date: null }),
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
