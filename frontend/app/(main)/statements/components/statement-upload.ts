'use client';

import apiClient from '@/app/lib/api';

export const RECEIPT_SCAN_UPLOAD_BATCH_SIZE = 5;

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

const chunkFiles = (files: File[], size: number): File[][] => {
  const chunks: File[][] = [];

  for (let index = 0; index < files.length; index += size) {
    chunks.push(files.slice(index, index + size));
  }

  return chunks;
};

// eslint-disable-next-line complexity
export const extractUploadErrorMessage = (error: unknown, fallback: string): string => {
  // HttpExceptionFilter wraps failures as { error: { message } }; older/plain
  // Nest responses still use a top-level { message }.
  const responseData = (
    error as {
      response?: { data?: { message?: unknown; error?: { message?: unknown } } };
    }
  )?.response?.data;
  const responseMessage = responseData?.error?.message ?? responseData?.message;

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
  for (const file of files) {
    formData.append('files', file);
  }
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

  try {
    for (const batch of chunkFiles(files, RECEIPT_SCAN_UPLOAD_BATCH_SIZE)) {
      const formData = new FormData();
      for (const file of batch) {
        formData.append('files', file);
      }

      await apiClient.post('/statements/upload-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }

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
