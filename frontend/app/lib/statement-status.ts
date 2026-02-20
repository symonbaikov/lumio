export const isStatementProcessingStatus = (status?: string | null): boolean => {
  const normalized = (status || '').toLowerCase();
  return normalized === 'processing' || normalized === 'uploaded';
};

type StatementParsingDetails = {
  detectedBy?: string | null;
  parserUsed?: string | null;
  importPreview?: {
    source?: string | null;
    merchant?: string | null;
  } | null;
};

type StatementLike = {
  parsingDetails?: StatementParsingDetails | null;
};

const MANUAL_EXPENSE_SOURCE = 'manual-expense';

export const hasProcessingStatements = (statements: Array<{ status?: string | null }>): boolean => {
  return statements.some(statement => isStatementProcessingStatus(statement.status));
};

export const getStatementMerchantLabel = (
  status: string | null | undefined,
  merchant: string,
  scanningLabel: string,
): string => (isStatementProcessingStatus(status) ? scanningLabel : merchant);

export const isManualExpenseStatement = (statement: StatementLike): boolean => {
  const detectedBy = statement.parsingDetails?.detectedBy?.toLowerCase();
  const parserUsed = statement.parsingDetails?.parserUsed?.toLowerCase();
  const source = statement.parsingDetails?.importPreview?.source?.toLowerCase();

  return (
    detectedBy === MANUAL_EXPENSE_SOURCE ||
    parserUsed === MANUAL_EXPENSE_SOURCE ||
    source === MANUAL_EXPENSE_SOURCE
  );
};

export const getStatementDisplayMerchant = (
  statement: StatementLike,
  fallbackMerchant: string,
): string => {
  const manualMerchant = statement.parsingDetails?.importPreview?.merchant?.trim();
  return manualMerchant && manualMerchant.length > 0 ? manualMerchant : fallbackMerchant;
};
