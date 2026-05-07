'use client';

import apiClient from '@/app/lib/api';

export type StatementUploadLabels = {
  pickAtLeastOne: string;
  uploadedProcessing: string;
  uploadFailed: string;
};

type UploadCallbacks = {
  onUploadSuccess: (message: string) => void;
  refreshAfterCreate: () => Promise<void>;
};

type UploadStatementFilesParams = UploadCallbacks & {
  files: File[];
  allowDuplicates: boolean;
  labels: StatementUploadLabels;
  requireManualCategorySelection?: boolean;
};

type UploadReceiptScanFilesParams = UploadCallbacks & {
  files: File[];
  labels: StatementUploadLabels;
};

type UploadScanDrawerFilesParams = UploadCallbacks & {
  labels: StatementUploadLabels;
  payload: {
    files: File[];
    allowDuplicates: boolean;
    requireManualCategorySelection: boolean;
  };
};

// eslint-disable-next-line complexity
export const extractUploadErrorMessage = (error: unknown, fallback: string): string => {
  const responseMessage = (error as { response?: { data?: { message?: unknown } } })?.response?.data
    ?.message;

  if (Array.isArray(responseMessage)) {
    const [firstMessage] = responseMessage;
    return typeof firstMessage === 'string' && firstMessage.trim() ? firstMessage : fallback;
  }

  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage;
  }

  return fallback;
};

export const uploadStatementFiles = async ({
  files,
  allowDuplicates,
  labels,
  onUploadSuccess,
  refreshAfterCreate,
  requireManualCategorySelection = false,
}: UploadStatementFilesParams): Promise<void> => {
  if (files.length === 0) {
    throw new Error(labels.pickAtLeastOne);
  }

  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  formData.append('allowDuplicates', allowDuplicates ? 'true' : 'false');
  formData.append(
    'requireManualCategorySelection',
    requireManualCategorySelection ? 'true' : 'false',
  );

  try {
    await apiClient.post('/statements/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    onUploadSuccess(labels.uploadedProcessing);
    await refreshAfterCreate();
  } catch (error) {
    console.error('Failed to upload statements:', error);
    throw new Error(extractUploadErrorMessage(error, labels.uploadFailed));
  }
};

export const uploadReceiptScanFiles = async ({
  files,
  labels,
  onUploadSuccess,
  refreshAfterCreate,
}: UploadReceiptScanFilesParams): Promise<void> => {
  if (files.length === 0) {
    throw new Error(labels.pickAtLeastOne);
  }

  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  try {
    await apiClient.post('/statements/upload-receipt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    onUploadSuccess(labels.uploadedProcessing);
    await refreshAfterCreate();
  } catch (error) {
    console.error('Failed to upload receipt scans:', error);
    throw new Error(extractUploadErrorMessage(error, labels.uploadFailed));
  }
};

export const uploadScanDrawerFiles = async ({
  payload,
  labels,
  onUploadSuccess,
  refreshAfterCreate,
}: UploadScanDrawerFilesParams): Promise<void> => {
  if (payload.files.length === 0) {
    throw new Error(labels.pickAtLeastOne);
  }

  await uploadReceiptScanFiles({
    files: payload.files,
    labels,
    onUploadSuccess,
    refreshAfterCreate,
  });
};
