export type FinancialDocumentStatus = 'draft' | 'needs_review' | 'approved' | 'submitted' | 'paid';

export interface ReceiptLineItem {
  description: string;
  amount: number;
}

export interface ReceiptParsedDataLike {
  amount?: number | string | null;
  vendor?: string | null;
  lineItems?: ReceiptLineItem[] | null;
}

const parseAmount = (value?: number | string | null): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
};

export const toFinancialDocumentStatus = (rawStatus?: string | null): FinancialDocumentStatus => {
  const normalized = (rawStatus || '').trim().toLowerCase();

  if (normalized === 'paid') {
    return 'paid';
  }

  if (normalized === 'submitted' || normalized === 'reviewed') {
    return 'submitted';
  }

  if (normalized === 'approved' || normalized === 'validated' || normalized === 'completed') {
    return 'approved';
  }

  if (
    normalized === 'needs_review' ||
    normalized === 'failed' ||
    normalized === 'error' ||
    normalized === 'rejected'
  ) {
    return 'needs_review';
  }

  return 'draft';
};

export const getFinancialDocumentStatusLabel = (status: FinancialDocumentStatus): string => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'needs_review':
      return 'Needs review';
    case 'approved':
      return 'Approved';
    case 'submitted':
      return 'Submitted';
    case 'paid':
      return 'Paid';
    default:
      return 'Draft';
  }
};

export const isLowConfidenceDocument = (confidence?: number | null, threshold = 0.8): boolean => {
  if (typeof confidence !== 'number' || !Number.isFinite(confidence)) {
    return false;
  }

  return confidence < threshold;
};

export const normalizeReceiptLineItems = (
  parsedData?: ReceiptParsedDataLike | null,
): ReceiptLineItem[] => {
  const lineItems = parsedData?.lineItems;
  if (Array.isArray(lineItems) && lineItems.length > 0) {
    return lineItems.filter(item => Number.isFinite(item.amount));
  }

  const amount = parseAmount(parsedData?.amount ?? null);
  if (amount === null) {
    return [];
  }

  return [
    {
      description: parsedData?.vendor?.trim() || 'Receipt total',
      amount,
    },
  ];
};
