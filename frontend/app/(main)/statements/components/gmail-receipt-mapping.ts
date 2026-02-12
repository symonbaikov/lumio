import { resolveGmailMerchantLabel } from '@/app/lib/gmail-merchant';

export interface GmailReceipt {
  id: string;
  subject: string;
  sender: string;
  receivedAt: string;
  status: string;
  parsedData?: {
    amount?: number | string | null;
    currency?: string;
    vendor?: string;
    date?: string;
  };
  gmailMessageId?: string;
}

interface GmailMappedParsedData {
  amount?: number;
  currency?: string;
  vendor?: string;
  date?: string;
}

export interface GmailMappedStatement {
  id: string;
  source: 'gmail';
  fileName: string;
  subject: string;
  sender: string;
  status: string;
  totalTransactions: number;
  totalDebit: number;
  totalCredit: null;
  exported: null;
  paid: null;
  createdAt: string;
  processedAt: undefined;
  statementDateFrom: string;
  statementDateTo: null;
  bankName: 'gmail';
  fileType: 'gmail';
  currency: string;
  user: null;
  errorMessage: string | null;
  gmailMessageId?: string;
  receivedAt: string;
  parsedData?: GmailMappedParsedData;
}

const parseAmountValue = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
};

export const hasGmailReceiptAmount = (receipt: GmailReceipt): boolean => {
  return parseAmountValue(receipt.parsedData?.amount ?? null) !== null;
};

export const mapGmailReceiptToStatement = (
  receipt: GmailReceipt,
): GmailMappedStatement | null => {
  const amount = parseAmountValue(receipt.parsedData?.amount ?? null);
  if (amount === null) {
    return null;
  }

  return {
    id: receipt.id,
    source: 'gmail',
    fileName: resolveGmailMerchantLabel({
      vendor: receipt.parsedData?.vendor,
      sender: receipt.sender,
      subject: receipt.subject,
      fallback: 'Gmail receipt',
    }),
    subject: receipt.subject,
    sender: receipt.sender,
    status: receipt.status,
    totalTransactions: 0,
    totalDebit: amount,
    totalCredit: null,
    exported: null,
    paid: null,
    createdAt: receipt.receivedAt,
    processedAt: undefined,
    statementDateFrom: receipt.parsedData?.date || receipt.receivedAt,
    statementDateTo: null,
    bankName: 'gmail',
    fileType: 'gmail',
    currency: receipt.parsedData?.currency || 'KZT',
    user: null,
    errorMessage: receipt.status === 'failed' ? 'Failed to parse' : null,
    gmailMessageId: receipt.gmailMessageId,
    receivedAt: receipt.receivedAt,
    parsedData: {
      amount,
      currency: receipt.parsedData?.currency,
      vendor: receipt.parsedData?.vendor,
      date: receipt.parsedData?.date,
    },
  };
};

export const mapGmailReceiptsToStatements = (
  receipts: GmailReceipt[],
): GmailMappedStatement[] => {
  return receipts.flatMap(receipt => {
    const mapped = mapGmailReceiptToStatement(receipt);
    return mapped ? [mapped] : [];
  });
};
