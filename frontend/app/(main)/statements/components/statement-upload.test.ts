// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  extractUploadErrorMessage,
  uploadReceiptScanFiles,
  uploadScanDrawerFiles,
  uploadStatementFiles,
} from './statement-upload';

const apiMocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('@/app/lib/api', () => ({
  default: {
    post: apiMocks.post,
  },
}));

const labels = {
  pickAtLeastOne: 'Select at least one file',
  uploadedProcessing: 'Files uploaded',
  uploadFailed: 'Failed to upload files',
};

describe('statement-upload helpers', () => {
  beforeEach(() => {
    apiMocks.post.mockReset();
  });

  it('extracts the first backend validation message from error payload arrays', () => {
    const error = {
      response: {
        data: {
          message: ['Receipt amount could not be determined', 'ignored'],
        },
      },
    };

    expect(extractUploadErrorMessage(error, labels.uploadFailed)).toBe(
      'Receipt amount could not be determined',
    );
  });

  it('extracts the message from the wrapped { error: { message } } envelope', () => {
    const error = {
      response: {
        data: {
          error: { code: 'BAD_REQUEST', message: 'Only image and PDF receipt files are supported' },
        },
      },
    };

    expect(extractUploadErrorMessage(error, labels.uploadFailed)).toBe(
      'Only image and PDF receipt files are supported',
    );
  });

  it('preserves backend receipt upload errors instead of replacing them with a generic message', async () => {
    const onUploadSuccess = vi.fn();
    const refreshAfterCreate = vi.fn().mockResolvedValue(undefined);

    apiMocks.post.mockRejectedValue({
      response: {
        data: {
          message: 'Receipt scan could not be processed',
        },
      },
    });

    await expect(
      uploadReceiptScanFiles({
        files: [new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' })],
        labels,
        onUploadSuccess,
        refreshAfterCreate,
      }),
    ).rejects.toThrow('Receipt scan could not be processed');

    expect(onUploadSuccess).not.toHaveBeenCalled();
    expect(refreshAfterCreate).not.toHaveBeenCalled();
  });

  it('routes all scan drawer files through the receipt endpoint', async () => {
    const onUploadSuccess = vi.fn();
    const refreshAfterCreate = vi.fn().mockResolvedValue(undefined);
    apiMocks.post.mockResolvedValue({ data: {} });

    await uploadScanDrawerFiles({
      payload: {
        files: [
          new File(['statement'], 'statement.pdf', { type: 'application/pdf' }),
          new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' }),
        ],
        allowDuplicates: true,
        requireManualCategorySelection: false,
      },
      labels,
      onUploadSuccess,
      refreshAfterCreate,
    });

    expect(apiMocks.post).toHaveBeenCalledTimes(1);
    expect(apiMocks.post).toHaveBeenCalledWith(
      '/statements/upload-receipt',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  });

  it('splits receipt scan batches into backend-sized upload requests', async () => {
    const onUploadSuccess = vi.fn();
    const refreshAfterCreate = vi.fn().mockResolvedValue(undefined);
    const files = Array.from(
      { length: 7 },
      (_, index) => new File([`receipt-${index}`], `receipt-${index}.jpg`, { type: 'image/jpeg' }),
    );

    apiMocks.post.mockResolvedValue({ data: {} });

    await uploadReceiptScanFiles({
      files,
      labels,
      onUploadSuccess,
      refreshAfterCreate,
    });

    expect(apiMocks.post).toHaveBeenCalledTimes(2);

    const firstBatch = apiMocks.post.mock.calls[0]?.[1] as FormData;
    const secondBatch = apiMocks.post.mock.calls[1]?.[1] as FormData;

    expect(firstBatch.getAll('files')).toHaveLength(5);
    expect(secondBatch.getAll('files')).toHaveLength(2);
    expect(onUploadSuccess).toHaveBeenCalledTimes(1);
    expect(refreshAfterCreate).toHaveBeenCalledTimes(1);
  });

  it('keeps statement uploads on the statement endpoint without receipt chunking', async () => {
    const onUploadSuccess = vi.fn();
    const refreshAfterCreate = vi.fn().mockResolvedValue(undefined);
    apiMocks.post.mockResolvedValue({ data: {} });

    await uploadStatementFiles({
      files: [new File(['statement'], 'statement.pdf', { type: 'application/pdf' })],
      allowDuplicates: true,
      labels,
      onUploadSuccess,
      refreshAfterCreate,
    });

    expect(apiMocks.post).toHaveBeenCalledTimes(1);
    expect(apiMocks.post).toHaveBeenCalledWith(
      '/statements/upload',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  });
});
