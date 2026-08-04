export interface ParsedTransaction {
  transactionDate: Date;
  documentNumber?: string;
  counterpartyName: string;
  counterpartyBin?: string;
  counterpartyAccount?: string;
  counterpartyBank?: string;
  debit?: number;
  credit?: number;
  paymentPurpose: string;
  currency?: string;
  exchangeRate?: number;
  amountForeign?: number;
}

export interface ParsedStatementMetadata {
  accountNumber: string;
  dateFrom: Date;
  dateTo: Date;
  balanceStart?: number;
  balanceEnd?: number;
  /**
   * Currency detected in the statement itself. Left `undefined` when the parser
   * could not detect one — parsers must not invent a default. The workspace
   * currency is applied downstream (see `StatementProcessingService`), which is
   * the only layer that knows the workspace context.
   */
  currency?: string;
  rawHeader?: string;
  normalizedHeader?: string;
  periodLabel?: string;
  institution?: string;
  locale?: string;

  // Enhanced header information for display
  headerDisplay?: {
    title?: string;
    subtitle?: string;
    periodDisplay?: string;
    accountDisplay?: string;
    institutionDisplay?: string;
    currencyDisplay?: string;
  };
}

export interface ParsedStatement {
  metadata: ParsedStatementMetadata;
  transactions: ParsedTransaction[];
}
