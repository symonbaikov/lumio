export const isStatementProcessingStatus = (status?: string | null): boolean => {
  const normalized = (status || '').toLowerCase();
  return normalized === 'processing' || normalized === 'uploaded';
};

export const hasProcessingStatements = (statements: Array<{ status?: string | null }>): boolean => {
  return statements.some(statement => isStatementProcessingStatus(statement.status));
};

export const getStatementMerchantLabel = (
  status: string | null | undefined,
  merchant: string,
  scanningLabel: string,
): string => (isStatementProcessingStatus(status) ? scanningLabel : merchant);
