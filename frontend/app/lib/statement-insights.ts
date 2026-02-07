export interface StatementInsightsSource {
  bankName?: string | null;
  totalDebit?: number | string | null;
  totalCredit?: number | string | null;
}

export interface TopBankSender {
  bankName: string;
  statementsCount: number;
  totalAmount: number;
}

const parseAmount = (value?: number | string | null): number => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

const getStatementAmount = (statement: StatementInsightsSource): number => {
  const debit = parseAmount(statement.totalDebit);
  const credit = parseAmount(statement.totalCredit);

  if (debit > 0) return debit;
  if (credit > 0) return credit;
  return 0;
};

export function getTopBankSenders(
  statements: StatementInsightsSource[],
  limit = 5,
): TopBankSender[] {
  const aggregate = new Map<string, TopBankSender>();

  for (const statement of statements) {
    const bankName = (statement.bankName || '').trim();
    if (!bankName) continue;

    const current = aggregate.get(bankName) ?? {
      bankName,
      statementsCount: 0,
      totalAmount: 0,
    };

    current.statementsCount += 1;
    current.totalAmount += getStatementAmount(statement);

    aggregate.set(bankName, current);
  }

  return Array.from(aggregate.values())
    .sort((a, b) => {
      if (b.statementsCount !== a.statementsCount) {
        return b.statementsCount - a.statementsCount;
      }
      if (b.totalAmount !== a.totalAmount) {
        return b.totalAmount - a.totalAmount;
      }
      return a.bankName.localeCompare(b.bankName);
    })
    .slice(0, Math.max(0, limit));
}
