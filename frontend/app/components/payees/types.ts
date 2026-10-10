/** Mirrors the backend `PayeeView`. */
export type PayeeMode = 'auto' | 'always' | 'never';

export type PayeeRef = { id: string; name: string };

export type Payee = PayeeRef & {
  mode: PayeeMode;
  /** The pinned category, when `mode` is `always`. */
  category: PayeeRef | null;
  /** What a new row of this payee would be filed as now, and why. */
  defaultCategory: (PayeeRef & { source: string }) | null;
  transactionCount: number;
  lastSeen: string | null;
};

export type PayeesPage = { data: Payee[]; total: number; page: number; limit: number };

/** Either an existing payee, or a name to find or create one by. */
export type PayeeChoice = { payeeId: string } | { name: string };

export type TransactionPayeeResult = {
  id: string;
  payee: PayeeRef;
  categoryId: string | null;
  categorySource: string | null;
};
