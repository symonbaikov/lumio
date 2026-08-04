import { DEFAULT_CURRENCY } from '@/app/lib/format-money';
import type { CreatePayableInput } from '@/app/lib/payables-api';

type StatementLike = {
  id: string;
  fileName: string;
  statementDateTo?: string | null;
  statementDateFrom?: string | null;
  parsingDetails?: {
    metadataExtracted?: {
      headerDisplay?: {
        currencyDisplay?: string;
      };
    };
  } | null;
};

type TransactionLike = {
  counterpartyName: string;
  debit?: number | string | null;
  credit?: number | string | null;
  transactionType: 'income' | 'expense';
};

const toNumber = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateOnly = (value?: string | null) => {
  if (!value) {
    return undefined;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
};

export const buildPayableFromStatement = ({
  statement,
  transactions,
}: {
  statement: StatementLike;
  transactions: TransactionLike[];
}): CreatePayableInput | null => {
  const expenseTransactions = transactions.filter(
    transaction => transaction.transactionType === 'expense',
  );
  const amount = expenseTransactions.reduce(
    (sum, transaction) => sum + Math.max(toNumber(transaction.debit), toNumber(transaction.credit)),
    0,
  );

  if (!(amount > 0)) {
    return null;
  }

  const vendor = expenseTransactions[0]?.counterpartyName?.trim() || statement.fileName;
  const currency =
    statement.parsingDetails?.metadataExtracted?.headerDisplay?.currencyDisplay?.trim() ||
    DEFAULT_CURRENCY;

  return {
    vendor,
    amount,
    currency,
    dueDate: toDateOnly(statement.statementDateTo || statement.statementDateFrom),
    source: 'statement',
    statementId: statement.id,
    comment: `Created from statement ${statement.fileName}`,
  };
};
